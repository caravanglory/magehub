---
name: module-plugin
description: "Implement Magento 2 plugins (interceptors) following best practices for before, after, and around method interception"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Plugin Development

### Activation

#### Use When

- The task is to alter behavior of an existing public Magento method without modifying the original class.
- The task mentions before/after/around plugins, interceptors, plugin sortOrder, disabled plugins, or di.xml plugin configuration.

#### Do Not Use When

- The target method is final, static, non-public, constructor/destructor, or otherwise not interceptable.
- A service contract implementation, observer, preference, event, or layout/config extension point is the safer project convention.

#### Required Inputs

- Target class, public method signature, desired before/after/around behavior, area scope, and expected interaction with existing plugins.
- Whether the plugin must preserve side effects, exceptions, and return-value contract exactly.

### Workflow

1. Inspect the target method signature, return type, visibility, existing plugins, and area-specific di.xml before choosing a plugin type.
2. Prefer before plugins for argument normalization and after plugins for return-value decoration; use around only when skipping or wrapping execution is required.
3. Create the plugin class with strict types, exact parameter/return typing, and minimal dependencies.
4. Register the plugin in the narrowest applicable di.xml scope with an intentional name and sortOrder.
5. Verify compile and targeted behavior after adding or changing the plugin.

### Guardrails

- Do not plugin final, static, private, protected, constructor, or destructor methods.
- Around plugins must call and return $proceed() unless the task explicitly requires blocking execution.
- Ask before pluginizing checkout, payment, customer authentication, inventory reservation, or price calculation flows. (approval required)

### Verification

- Run bin/magento setup:di:compile or the project wrapper after adding plugin classes or di.xml entries.
- Run targeted unit/integration tests for the modified behavior and at least one pass-through case.
- When changing plugin sortOrder, inspect sibling plugins and report the final execution order.

### Output Contract

- State target class/method, plugin type, di.xml scope, plugin name, sortOrder, and whether $proceed() is preserved.
- Report compile/test commands and any unverified plugin-chain interactions.

### Magento 2 Plugin Development Guide

Plugins (interceptors) allow you to modify the behavior of public methods
without changing the original class. This is a core Magento 2 extension mechanism.

### When to Use Plugins

Use plugins when you need to:

- Modify input parameters before method execution (before plugin)
- Modify return values after method execution (after plugin)
- Completely wrap method execution (around plugin)

Do not use a plugin when a service contract implementation, event observer,
layout XML update, extension attribute, or explicit configuration extension
point gives the same result with less coupling. Plugins are powerful but they
bind the module to a concrete method signature and call order.

### Interception Limits

Magento plugins only intercept public instance methods on classes managed by
the object manager. They do not intercept final methods, final classes, static
methods, constructors, destructors, private methods, protected methods, or
objects instantiated before interception is generated. Always inspect the
target method before writing the plugin.

### Plugin Types

1. **Before Plugin** - Modifies input parameters
2. **After Plugin** - Modifies return value
3. **Around Plugin** - Wraps entire method (use sparingly)

Prefer before and after plugins because they preserve the original call chain.
Use around plugins only when the plugin must conditionally skip execution,
wrap exceptions, measure execution, or change control flow. An around plugin
must call `$proceed(...$args)` and return its result unless the task explicitly
requires blocking the original method.

### Method Signatures

Plugin method signatures must mirror the target method closely:

- Before plugins receive `$subject` followed by the original arguments and
  return an array of replacement arguments or `null`.
- After plugins receive `$subject`, `$result`, then the original arguments and
  return the replacement result.
- Around plugins receive `$subject`, `callable $proceed`, then original
  arguments and return a value compatible with the target method return type.

Preserve nullable, union, and by-reference parameters exactly. If the target
method has optional parameters, keep the same defaults in the plugin method.

### Implementation Steps

1. Create plugin class in `Plugin/` directory
2. Declare plugin in `etc/di.xml`
3. Implement appropriate plugin method(s)

### di.xml Registration

Register plugins on the concrete target type or interface in the narrowest
area scope that applies: `etc/di.xml`, `etc/frontend/di.xml`, or
`etc/adminhtml/di.xml`. Give every plugin a stable `name`, use `sortOrder`
only when order matters, and set `disabled="true"` only when intentionally
turning off another module's plugin with a documented reason.

### Chain Safety

Before changing plugin order or adding an around plugin, inspect sibling
plugins on the same target. Multiple around plugins nest by sort order, and a
single plugin that fails to call `$proceed()` prevents all downstream plugins
and the original method from running. Keep side effects minimal and avoid
mutating objects returned by after plugins unless the target method contract
allows mutable returns.

### Verification

After adding or changing a plugin, run `bin/magento setup:di:compile` through
the project environment wrapper. Add or update a targeted test for the modified
behavior and a pass-through case proving the original method behavior still
works when the plugin condition does not apply.

### Conventions

- Plugin class naming: {TargetClassShortName}{PluginPurpose}Plugin
  Example: ProductPriceModifierPlugin
  Rationale: Clear identification of what the plugin targets and does
- Prefer before/after plugins over around plugins
  Example: Use afterGetPrice() instead of aroundGetPrice() when only modifying return value
  Rationale: Around plugins break the plugin chain if not implemented correctly
- Always include type hints for all parameters
  Example: public function beforeSetName(Product $subject, string $name): array
  Rationale: Type safety and IDE autocompletion

### Examples

#### Before Plugin

Modify product name before saving

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Plugin;

use Magento\Catalog\Model\Product;

class ProductNameNormalizerPlugin
{
    public function beforeSetName(Product $subject, string $name): array
    {
        return [trim(strtoupper($name))];
    }
}
```

#### After Plugin

Append suffix to product name

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Plugin;

use Magento\Catalog\Model\Product;

class ProductNameSuffixPlugin
{
    public function afterGetName(Product $subject, string $result): string
    {
        return $result . ' - On Sale';
    }
}
```

#### di.xml Configuration

Plugin declaration

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    <type name="Magento\Catalog\Model\Product">
        <plugin name="vendor_module_product_name_normalizer"
                type="Vendor\Module\Plugin\ProductNameNormalizerPlugin"
                sortOrder="10"/>
    </type>
</config>
```


### Anti-patterns

- Using around plugin when before/after would suffice: Around plugins are harder to debug and can break plugin chain
  Solution: Only use around when you need to conditionally skip method execution
- Plugin on __construct method: Constructor plugins are not supported
  Solution: Use preference or composition instead
- Plugin on private/protected methods: Only public methods can be intercepted
  Solution: Consider preference if you must modify non-public methods

### File Templates

#### Plugin/{ClassName}Plugin.php

Path template:

```text
Plugin/{ClassName}Plugin.php
```

Plugin class file

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Plugin;

class {{className}}Plugin
{
    public function before{{method}}($subject, ...$args): array
    {
        return [...$args];
    }
}
```

#### etc/di.xml

Path template:

```text
etc/di.xml
```

Plugin declaration

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    <type name="{{targetClass}}">
        <plugin name="{{pluginName}}"
                type="{{vendor}}\{{module}}\Plugin\{{className}}Plugin"
                sortOrder="10"/>
    </type>
</config>
```


### References

- [Magento DevDocs: Plugins](https://developer.adobe.com/commerce/php/development/components/plugins/)
- [Plugin Best Practices](https://developer.adobe.com/commerce/php/best-practices/extensions/plugins/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x plugins/interceptors docs
