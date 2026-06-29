---
name: module-scaffold
description: "Create a new Magento 2 module with the required directory structure, registration files, composer autoloading, and module sequence declarations"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Module Scaffolding

### Activation

#### Use When

- The task is to create a new Magento module skeleton or repair missing registration.php, etc/module.xml, or composer.json metadata.
- The task mentions app/code, module registration, module.xml sequence, Composer autoloading, or enabling a new module.

#### Do Not Use When

- The module already exists and the task is about DI, plugins, setup scripts, API, or admin UI behavior.
- The task is to package an existing module for Marketplace or Composer distribution beyond the basic skeleton.

#### Required Inputs

- Vendor name, module name, install path strategy (app/code or Composer package), and direct module dependencies if any.
- Whether the module should be enabled immediately and which environment wrapper runs Magento commands.

### Workflow

1. Inspect the repository structure and naming conventions before creating files.
2. Create the minimal module skeleton: registration.php, etc/module.xml, composer.json, and sequence entries only for direct config/schema dependencies.
3. Keep the scaffold free of business logic, setup scripts, DI wiring, and frontend/admin artifacts unless the task explicitly asks for them.
4. Run the smallest command that proves Magento can discover the module.

### Guardrails

- Do not add broad module sequence dependencies just to force load order.
- Do not run module:enable or setup:upgrade without confirming the project environment wrapper and working tree state.
- Ask before enabling a module or running setup:upgrade because it changes generated config/database state. (approval required)

### Verification

- Run composer validate when composer.json is created or changed.
- Run bin/magento module:status Vendor_Module through the project wrapper when Magento is available.
- Run setup:di:compile only when scaffold includes DI-bearing classes or the project requires compile as a discovery gate.

### Output Contract

- List created scaffold files, module name, dependency sequence entries, autoload mapping, and commands run.
- State whether module enable/setup:upgrade was executed or intentionally skipped.

### Magento 2 Module Bootstrap

Every custom module requires three files before Magento will recognize it:
`registration.php`, `etc/module.xml`, and `composer.json`. Missing any one of
these causes the module to be silently ignored during setup:upgrade.

### Directory Layout

Place module source under `app/code/<Vendor>/<Module>/` for project-level
modules or ship as a Composer package installed into `vendor/`. The directory
name must match the `Vendor_Module` identifier exactly — case-sensitive on
Linux filesystems.

Recommended initial structure:

- `registration.php` — registers the component with the framework
- `etc/module.xml` — declares the module name and setup version sequence
- `composer.json` — PSR-4 autoloading, package metadata, and dependencies

### Registration File

`registration.php` must call `ComponentRegistrar::register()` with the
`MODULE` type and the `Vendor_ModuleName` identifier. This file is
auto-included by the Composer-generated autoloader; it must not contain class
definitions or side-effects beyond the single register call.

### Module XML and Sequencing

Declare `<module name="Vendor_ModuleName">` in `etc/module.xml`. Use the
`<sequence>` element to list modules that must load before yours — this
controls schema patch and config merge ordering, not runtime dependency
injection. Only declare sequence entries for modules whose configuration,
schema, or layout your module directly overrides.

### Composer Configuration

Set `type` to `magento2-module` so the Magento Composer installer places the
package correctly. Map the PSR-4 namespace root to the module directory.
Require `magento/framework` at a minimum and add specific module dependencies
as Composer `require` entries, keeping them aligned with `<sequence>`.

### Post-Scaffold Steps

Run `bin/magento module:enable Vendor_ModuleName` followed by
`bin/magento setup:upgrade` to register the module in `config.php` and
execute any setup patches.

### Conventions

- Name modules as Vendor_ModuleName using PascalCase for both segments
  Example: Acme_InventoryReservation, not acme_inventory-reservation
  Rationale: Magento module discovery splits on underscore and expects PascalCase directory names. Incorrect casing causes autoload failures on case-sensitive filesystems.
- Declare sequence dependencies only for modules whose config or schema you directly override
  Example: <sequence><module name="Magento_Catalog"/></sequence> when overriding catalog layout XML
  Rationale: Over-sequencing creates unnecessary load-order constraints and slows setup:upgrade. Under-sequencing causes config merge order bugs that surface only in specific environments.
- Keep registration.php free of logic — one register call only
  Example: ComponentRegistrar::register(ComponentRegistrar::MODULE, 'Vendor_Module', __DIR__);
  Rationale: Registration files execute on every request via Composer autoload. Side-effects here bypass the DI container and cause hard-to-trace performance and compatibility issues.

### Examples

#### registration.php

Standard module registration file with strict types and the single required ComponentRegistrar call

```php
<?php
declare(strict_types=1);

use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(ComponentRegistrar::MODULE, 'Vendor_Module', __DIR__);
```

#### etc/module.xml with sequence

Module declaration with a sequence dependency on Magento_Catalog to ensure correct config merge and schema patch order

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Module/etc/module.xsd">
    <module name="Vendor_Module">
        <sequence>
            <module name="Magento_Catalog"/>
        </sequence>
    </module>
</config>
```

#### composer.json

Composer package definition with PSR-4 autoloading, magento2-module type, and framework dependency

```json
{
  "name": "vendor/module-module",
  "description": "Custom Magento 2 module",
  "type": "magento2-module",
  "require": {
    "php": ">=8.1",
    "magento/framework": "*"
  },
  "autoload": {
    "files": ["registration.php"],
    "psr-4": {
      "Vendor\\Module\\": ""
    }
  }
}
```


### Anti-patterns

- Missing etc/module.xml while registration.php exists: The module registers with the autoloader but Magento's module manager never loads it. Commands like setup:upgrade silently skip it, and no error appears in logs.
  Solution: Always create etc/module.xml alongside registration.php. Run bin/magento module:status to verify the module appears in the enabled or disabled list.
- Hardcoding setup_version in module.xml for new modules: The setup_version attribute is a legacy pattern from Magento 2.2 and earlier. Declarative schema and data patches replaced version-based setup scripts. Including it causes confusion about which migration system is active.
  Solution: Omit setup_version entirely for new modules. Use db_schema.xml for table definitions and DataPatchInterface classes for data migrations.
- PSR-4 namespace root does not match directory path: Autoloader cannot find classes. Fatal errors appear only at runtime when the class is first instantiated through DI, making the root cause non-obvious.
  Solution: Ensure the psr-4 key matches the directory structure exactly:
"psr-4": { "Vendor\\Module\\": "" }
for app/code/Vendor/Module, or adjust the path when using a src/ subdirectory.


### File Templates

#### registration.php

Path template:

```text
registration.php
```

Module registration file — required for Magento to discover the module

```php
<?php
declare(strict_types=1);

use Magento\Framework\Component\ComponentRegistrar;

ComponentRegistrar::register(ComponentRegistrar::MODULE, '{{vendor}}_{{module}}', __DIR__);
```

#### etc/module.xml

Path template:

```text
etc/module.xml
```

Module declaration with optional sequence dependencies

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Module/etc/module.xsd">
    <module name="{{vendor}}_{{module}}"/>
</config>
```


### References

- [Adobe Commerce: Module registration](https://developer.adobe.com/commerce/php/development/build/component-registration/)
- [Adobe Commerce: Module dependencies](https://developer.adobe.com/commerce/php/development/build/component-file-structure/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x module file structure and registration docs
