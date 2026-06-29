---
name: api-graphql-resolver
description: "Implement Magento 2 GraphQL resolvers — define schema.graphqls types, write query and mutation resolvers, and handle authorization"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# GraphQL Resolver

### Activation

#### Use When

- The task is to add or modify Magento GraphQL schema, query resolvers, mutation resolvers, or GraphQL authorization behavior.
- The task mentions etc/schema.graphqls, @resolver, ResolverInterface, GraphQlInputException, or customer/admin GraphQL context.

#### Do Not Use When

- The task is REST webapi.xml work without GraphQL schema or resolver changes.
- The task is only internal service logic where no GraphQL transport mapping is required.

#### Required Inputs

- GraphQL field or mutation name, input shape, output type, authorization requirement, and service/repository to delegate to.
- Backward compatibility expectation for existing schema fields and clients.

### Workflow

1. Inspect existing schema.graphqls files, resolver classes, service contracts, authorization checks, and tests for the same domain.
2. Design the schema first, keeping queries/mutations backward-compatible and field names explicit.
3. Implement thin resolvers that validate input, check authorization, delegate to services/repositories, and return arrays matching the schema.
4. Add or update unit/API-functional coverage for success, validation failure, authorization failure, and missing entity paths.

### Guardrails

- Treat all GraphQL arguments and LLM-generated or client-generated payloads as untrusted input.
- Do not query collections directly from resolvers when a service contract or repository exists.
- Ask before introducing a breaking schema change such as field removal, type change, or required input addition. (approval required)

### Verification

- Run bin/magento setup:di:compile or the project wrapper for new resolver classes and constructor dependencies.
- Run targeted unit tests and GraphQL/API functional tests when available.
- Run a sample GraphQL query or mutation against the local environment when credentials/session are available.

### Output Contract

- State the schema fields changed, resolver classes touched, authorization model, and sample query/mutation used for verification.
- Flag any backward-compatibility risk explicitly.

### Magento 2 GraphQL Architecture

Magento's GraphQL layer maps schema fields to PHP resolver classes. The
framework merges all `etc/schema.graphqls` files from enabled modules into a
single schema, then dispatches incoming queries to the resolver class specified
in the `@resolver` directive.

### Schema Definition

Define types, queries, and mutations in `etc/schema.graphqls`. Extend existing
Magento types using `extend type Query` or `extend type Mutation`. Use
`@resolver(class:)` to bind each field to a PHP class. Input types group
mutation arguments into a single typed object for cleaner signatures.

### Query Resolvers

Implement `Magento\Framework\GraphQl\Query\ResolverInterface` for query
fields. The `resolve()` method receives the field, context, resolution info,
and arguments. Return an associative array matching the declared GraphQL type
fields. Keep business logic in service classes — resolvers should only
translate between GraphQL arguments and service method calls.

### Mutation Resolvers

Mutation resolvers follow the same interface but perform write operations.
Validate input arguments early and throw `GraphQlInputException` for user
errors. Wrap the service call and return the created or modified entity data
as an associative array matching the mutation return type.

### Authorization

Check `$context->getExtensionAttributes()->getIsCustomer()` for customer-only
fields. Throw `GraphQlAuthorizationException` when access is denied. For
admin-only fields, use bearer token authentication and verify the admin
context.

### Error Handling

Use `GraphQlInputException` for validation errors, `GraphQlNoSuchEntityException`
for missing resources, and `GraphQlAuthorizationException` for permission
failures. These exception types produce structured GraphQL error responses
with appropriate HTTP status codes.

### Conventions

- Keep resolvers thin — delegate all business logic to service or repository classes
  Example: Resolver calls $this->productRepository->getById($args['id']) and returns the result array
  Rationale: Thin resolvers are easier to test, reuse across REST and GraphQL, and maintain separation between transport layer and domain logic.
- Validate all required arguments at the start of resolve() and throw GraphQlInputException for invalid input
  Example: if (empty($args['input']['name'])) { throw new GraphQlInputException(__('Name is required')); }
  Rationale: Early validation provides clear error messages to API consumers and prevents partial operations that leave data in an inconsistent state.
- Return associative arrays from resolvers matching the declared GraphQL type fields exactly
  Example: return ['id' => $entity->getId(), 'name' => $entity->getName(), 'created_at' => $entity->getCreatedAt()];
  Rationale: Magento's GraphQL framework maps array keys to type fields. Missing keys cause null responses; extra keys are silently ignored. Matching the schema prevents subtle data omission bugs.

### Examples

#### schema.graphqls with query and mutation

GraphQL schema defining a custom type, a query field with resolver binding, and a mutation with input type

```graphql
type Query {
  customEntity(id: Int! @doc(description: "Entity ID")): CustomEntity
    @resolver(class: "Vendor\\Module\\Model\\Resolver\\CustomEntity")
    @doc(description: "Retrieve a custom entity by ID")
}

type Mutation {
  createCustomEntity(input: CustomEntityInput!): CustomEntity
    @resolver(class: "Vendor\\Module\\Model\\Resolver\\CreateCustomEntity")
    @doc(description: "Create a new custom entity")
}

type CustomEntity @doc(description: "Custom entity type") {
  id: Int @doc(description: "Entity ID")
  name: String @doc(description: "Entity name")
  is_active: Boolean @doc(description: "Active status")
  created_at: String @doc(description: "Creation timestamp")
}

input CustomEntityInput
  @doc(description: "Input for creating a custom entity") {
  name: String! @doc(description: "Entity name")
  is_active: Boolean @doc(description: "Active status, defaults to true")
}
```

#### Query resolver implementation

Resolver class that fetches a single entity by ID, delegates to a repository, and returns the typed result array

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model\Resolver;

use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Vendor\Module\Api\EntityRepositoryInterface;

class CustomEntity implements ResolverInterface
{
    public function __construct(
        private readonly EntityRepositoryInterface $entityRepository
    ) {
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ): array {
        if (!isset($args['id'])) {
            throw new GraphQlInputException(__('Entity ID is required.'));
        }

        try {
            $entity = $this->entityRepository->getById((int) $args['id']);
        } catch (NoSuchEntityException $e) {
            throw new GraphQlNoSuchEntityException(
                __('Entity with ID "%1" does not exist.', $args['id'])
            );
        }

        return [
            'id' => (int) $entity->getId(),
            'name' => $entity->getName(),
            'is_active' => (bool) $entity->getIsActive(),
            'created_at' => $entity->getCreatedAt(),
        ];
    }
}
```

#### Mutation resolver with input validation

Resolver that validates input, delegates entity creation to a service class, and returns the new entity data

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Vendor\Module\Api\EntityRepositoryInterface;
use Vendor\Module\Api\Data\EntityInterfaceFactory;

class CreateCustomEntity implements ResolverInterface
{
    public function __construct(
        private readonly EntityRepositoryInterface $entityRepository,
        private readonly EntityInterfaceFactory $entityFactory
    ) {
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ): array {
        $input = $args['input'] ?? [];

        if (empty($input['name'])) {
            throw new GraphQlInputException(__('Name is required.'));
        }

        $entity = $this->entityFactory->create();
        $entity->setName($input['name']);
        $entity->setIsActive($input['is_active'] ?? true);

        $saved = $this->entityRepository->save($entity);

        return [
            'id' => (int) $saved->getId(),
            'name' => $saved->getName(),
            'is_active' => (bool) $saved->getIsActive(),
            'created_at' => $saved->getCreatedAt(),
        ];
    }
}
```


### Anti-patterns

- Embedding repository calls, data formatting, and business rules directly in the resolver: Fat resolvers become untestable and cannot share logic with REST endpoints. Changes to business rules require modifying the transport layer, increasing the risk of regressions in API behavior.
  Solution: Extract business logic into service classes injected via the constructor. The resolver should only translate between GraphQL arguments and service method parameters.
- Returning raw model objects instead of typed arrays from resolve(): Magento's GraphQL framework expects associative arrays keyed by the GraphQL type field names. Returning model objects causes null values for all fields because the framework cannot map object properties to the schema.
  Solution: Always return an associative array matching the schema:
return [
    'id' => (int) $entity->getId(),
    'name' => $entity->getName(),
];

- Missing authorization checks in resolvers that handle customer or admin data: Without explicit authorization checks, guest users can access customer data and unauthenticated requests can trigger admin operations. GraphQL introspection reveals the available fields, making unprotected resolvers easy to exploit.
  Solution: Check authentication context at the start of resolve():
if (false === $context->getExtensionAttributes()->getIsCustomer()) {
    throw new GraphQlAuthorizationException(__('Customer login required.'));
}


### File Templates

#### etc/schema.graphqls

Path template:

```text
etc/schema.graphqls
```

GraphQL schema defining custom types, query fields, and mutations with resolver bindings

```graphql
type Query {
    {{entityName}}(id: Int! @doc(description: "Entity ID")): {{typeName}}
        @resolver(class: "{{vendor}}\\{{module}}\\Model\\Resolver\\{{typeName}}")
        @doc(description: "Retrieve {{entityName}} by ID")
}

type {{typeName}} @doc(description: "{{typeName}} entity type") {
    id: Int @doc(description: "Entity ID")
    name: String @doc(description: "Entity name")
}
```

#### Model/Resolver/<typeName>.php

Path template:

```text
Model/Resolver/{{typeName}}.php
```

Query resolver class implementing ResolverInterface

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;

class {{typeName}} implements ResolverInterface
{
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ): array {
        // Delegate to service class and return typed array
        return [];
    }
}
```


### References

- [Adobe Commerce: GraphQL development](https://developer.adobe.com/commerce/webapi/graphql/develop/)
- [Adobe Commerce: Define the GraphQL schema](https://developer.adobe.com/commerce/webapi/graphql/develop/create-graphqls-file/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x GraphQL development docs
