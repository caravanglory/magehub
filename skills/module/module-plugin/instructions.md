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
