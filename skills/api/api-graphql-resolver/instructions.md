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
