---
name: module-di
description: "Configure Magento 2 dependency injection — preferences, virtual types, constructor arguments, and proxy generation via di.xml"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Dependency Injection

### Activation

#### Use When

- The task is to configure or review Magento dependency injection: preferences, type arguments, virtual types, proxies, factories, or area-scoped di.xml.
- The task mentions ObjectManager, constructor injection, circular dependencies, generated proxies, or di.xml compile errors.

#### Do Not Use When

- The task is only to create the initial module registration files with no DI wiring.
- The task is a plugin/interceptor change where module-plugin provides the specific guidance.

#### Required Inputs

- Target class/interface, intended implementation, area scope, constructor argument names, and whether dependencies are expensive or optional.
- Relevant compile/runtime error when troubleshooting DI failures.

### Workflow

1. Inspect constructor signatures, existing di.xml scopes, module sequence, and generated error messages before editing DI configuration.
2. Prefer constructor-injected interfaces and narrow area-scoped configuration over broad global preferences.
3. Use virtual types for argument variations and proxies/factories for expensive or conditional dependencies.
4. Run compile or targeted tests after changing constructor signatures or DI XML.

### Guardrails

- Do not add direct ObjectManager calls in services, models, controllers, observers, or tests.
- Do not create global preferences for core interfaces without checking blast radius and existing project conventions.
- Ask before replacing a core preference or changing DI for checkout, payment, customer auth, or catalog price flows. (approval required)

### Verification

- Run bin/magento setup:di:compile or the project wrapper after DI XML or constructor changes.
- Run targeted unit tests for services whose constructor dependencies changed.
- When fixing compile errors, include the original error and the command proving it is resolved.

### Output Contract

- Report each preference, virtual type, proxy, factory, or constructor signature changed and its area scope.
- State the compile/test command run and any remaining DI risk.

### Magento 2 Dependency Injection System

Magento's object manager resolves all class dependencies through constructor
injection configured in `etc/di.xml`. Understanding this system is essential
because every service, model, and controller receives its collaborators
through the DI container — never through manual instantiation.

### Constructor Injection

Declare all dependencies as constructor parameters with interface type hints.
The object manager automatically resolves concrete implementations based on
`di.xml` preferences. Avoid requesting concrete classes directly — interface
injection keeps your code decoupled and allows other modules to substitute
implementations via preferences.

### Preferences

Use `<preference>` to bind an interface to its default concrete implementation.
Preferences are global unless scoped to a specific area (`etc/frontend/di.xml`,
`etc/adminhtml/di.xml`). Only one preference per interface can be active at a
time — later-loaded modules override earlier ones based on sequence order.

### Virtual Types

Create `<virtualType>` entries when you need a class with a different set of
constructor arguments but no behavioral changes. Virtual types avoid creating
empty subclasses solely to change injected values. They are resolved only by
the DI container — they have no real PHP class file and cannot be used with
`instanceof` checks.

### Proxy Classes

Declare `<proxy>` types for expensive dependencies that are not always used.
Proxies defer instantiation until the first method call, reducing the cost of
object graph construction. Use proxies on optional collaborators in commands,
cron jobs, and observers where the dependency is invoked conditionally.

### Area Scoping

Place `di.xml` in `etc/` for global scope, `etc/frontend/` for storefront,
and `etc/adminhtml/` for admin. Area-scoped configuration overrides global
configuration. Keep preferences and type configurations in the narrowest scope
that applies to prevent unintended side effects in other areas.

### Conventions

- Inject interfaces, not concrete classes, in constructor parameters
  Example: public function __construct(ProductRepositoryInterface $productRepository)
  Rationale: Interface injection allows other modules to substitute implementations via preferences and keeps code decoupled from specific implementations.
- Use virtual types instead of empty subclasses when only constructor arguments differ
  Example: <virtualType name="CustomLogger" type="Magento\Framework\Logger\Monolog"> with custom handler arguments
  Rationale: Virtual types eliminate unnecessary PHP class files and make the DI configuration the single source of truth for constructor wiring.
- Never call ObjectManager directly in business classes
  Example: Replace ObjectManager::getInstance()->get(Logger::class) with constructor-injected LoggerInterface
  Rationale: Direct ObjectManager usage hides dependencies, breaks unit test isolation, and circumvents the DI configuration that other modules rely on for customization.

### Examples

#### Interface preference binding

Bind an interface to its concrete implementation so the object manager resolves the correct class for all constructor injections

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    <preference for="Vendor\Module\Api\DataProviderInterface"
                type="Vendor\Module\Model\DataProvider"/>
</config>
```

#### Virtual type with custom constructor arguments

Create a virtual logger instance with a custom handler without writing a PHP subclass

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    <virtualType name="Vendor\Module\Model\VirtualDebugLogger"
                 type="Magento\Framework\Logger\Monolog">
        <arguments>
            <argument name="name" xsi:type="string">vendor_module</argument>
            <argument name="handlers" xsi:type="array">
                <item name="debug" xsi:type="object">Vendor\Module\Logger\DebugHandler</item>
            </argument>
        </arguments>
    </virtualType>

    <type name="Vendor\Module\Model\ImportProcessor">
        <arguments>
            <argument name="logger" xsi:type="object">Vendor\Module\Model\VirtualDebugLogger</argument>
        </arguments>
    </type>
</config>
```

#### Service class with constructor injection

Production-ready service class demonstrating proper constructor injection with interface type hints

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Psr\Log\LoggerInterface;

class ProductDataExporter
{
    public function __construct(
        private readonly ProductRepositoryInterface $productRepository,
        private readonly SearchCriteriaBuilder $searchCriteriaBuilder,
        private readonly LoggerInterface $logger
    ) {
    }

    public function getActiveProducts(int $storeId): array
    {
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('status', 1)
            ->addFilter('store_id', $storeId)
            ->create();

        try {
            $result = $this->productRepository->getList($criteria);
        } catch (\Exception $e) {
            $this->logger->error('Failed to load products', [
                'store_id' => $storeId,
                'exception' => $e->getMessage(),
            ]);

            return [];
        }

        return $result->getItems();
    }
}
```


### Anti-patterns

- Direct ObjectManager usage in models, services, or controllers: Hidden dependencies make the class impossible to unit test in isolation. Other modules cannot substitute implementations via di.xml because the dependency is resolved at call time, bypassing the DI container.
  Solution: Replace all ObjectManager::getInstance()->get() and create() calls with
constructor-injected dependencies:
public function __construct(
    private readonly ProductRepositoryInterface $productRepository
) {}

- Creating empty PHP subclasses only to change constructor arguments: Pollutes the codebase with classes that contain no logic. Each empty subclass is another file to maintain and adds confusion about where behavior lives.
  Solution: Use a virtualType in di.xml instead:
<virtualType name="CustomizedService" type="Vendor\Module\Model\BaseService">
    <arguments>
        <argument name="config" xsi:type="string">custom_value</argument>
    </arguments>
</virtualType>

- Defining preferences in global di.xml when they only apply to one area: A global preference overrides the interface binding in all areas — frontend, adminhtml, cron, REST, GraphQL. This causes unintended behavior when different areas need different implementations.
  Solution: Place the preference in the area-specific di.xml file (etc/frontend/di.xml or etc/adminhtml/di.xml) to restrict the binding to the intended scope.

### File Templates

#### etc/di.xml

Path template:

```text
etc/di.xml
```

Global dependency injection configuration with preferences and type argument overrides

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    <preference for="{{vendor}}\{{module}}\Api\{{interfaceName}}"
                type="{{vendor}}\{{module}}\Model\{{className}}"/>
</config>
```

#### Api/<interfaceName>.php

Path template:

```text
Api/{{interfaceName}}.php
```

Service contract interface for the module's primary API

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Api;

interface {{interfaceName}}
{
    /**
     * @return mixed
     */
    public function execute(): mixed;
}
```


### References

- [Adobe Commerce: Dependency injection configuration](https://developer.adobe.com/commerce/php/development/build/dependency-injection-file/)
- [Adobe Commerce: Object manager overview](https://developer.adobe.com/commerce/php/development/components/object-manager/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x dependency injection docs
