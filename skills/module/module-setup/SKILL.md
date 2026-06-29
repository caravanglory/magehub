---
name: module-setup
description: "Implement declarative schema (db_schema.xml), data patches, and schema patches for Magento 2 database structure and data migrations"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Setup Scripts

### Activation

#### Use When

- The task is to create or modify Magento declarative schema, data patches, schema patches, db_schema_whitelist.json, or setup-time data migrations.
- The task mentions db_schema.xml, DataPatchInterface, SchemaPatchInterface, patch_list, setup:upgrade, or schema whitelist generation.

#### Do Not Use When

- The task is runtime repository CRUD with no schema or setup-time data change.
- The task asks for legacy InstallSchema/UpgradeSchema for a new Magento 2.3+ module.

#### Required Inputs

- Table/column/index/constraint definitions or data migration intent, existing data safety requirements, and target module name.
- Whether setup:upgrade and whitelist generation can run in the current environment.

### Workflow

1. Inspect existing schema, patches, resource models, setup history, and data ownership before changing database structure.
2. Represent standard DDL in db_schema.xml; use schema patches only for operations declarative schema cannot express.
3. Make data patches idempotent and dependency-ordered with getDependencies() and getAliases() where needed.
4. Regenerate db_schema_whitelist.json after schema changes and verify setup status.

### Guardrails

- Do not drop, rename, or narrow columns with existing data without an explicit migration plan and approval. (approval required)
- Do not hand-edit db_schema_whitelist.json except to review generated output.
- Ask before running setup:upgrade because it can apply database changes. (approval required)

### Verification

- Run XML validation or bin/magento setup:db:status after schema changes.
- Run bin/magento setup:db-declaration:generate-whitelist --module-name=Vendor_Module after db_schema.xml changes.
- Run setup:upgrade in an approved local/staging environment and report whether data patches executed cleanly.

### Output Contract

- List schema objects changed, patch classes added, idempotency checks, whitelist changes, and database commands run.
- Flag any data-loss or rollback risk explicitly.

### Declarative Schema Overview

Magento 2.3+ uses declarative schema (`etc/db_schema.xml`) to define database
table structures instead of legacy InstallSchema/UpgradeSchema scripts. The
framework compares the declared state against the current database state and
generates the necessary ALTER/CREATE statements automatically. This is the
only supported approach for new modules.

### db_schema.xml Structure

Define tables, columns, constraints, and indexes in `etc/db_schema.xml`. Each
column requires `name`, `xsi:type`, and `nullable` attributes at minimum.
Primary keys use `<constraint>` with `referenceId="PRIMARY"`. Foreign keys
reference the parent table and column, and Magento enforces referential
integrity at the database level.

### Schema Whitelist

After modifying `db_schema.xml`, run
`bin/magento setup:db-declaration:generate-whitelist --module-name=Vendor_Module`
to update `etc/db_schema_whitelist.json`. The whitelist tracks which schema
elements your module owns so that `setup:upgrade` can safely drop columns and
tables during uninstallation. Never edit the whitelist manually.

### Data Patches

Use `DataPatchInterface` classes in `Setup/Patch/Data/` for inserting or
modifying data — configuration values, attribute creation, seed data. Data
patches run once and are tracked in the `patch_list` table. Make every patch
idempotent because `setup:upgrade` may execute patches in any order relative
to other modules.

### Schema Patches

Use `SchemaPatchInterface` in `Setup/Patch/Schema/` for DDL operations that
cannot be expressed in declarative schema — triggers, stored procedures, or
complex index operations. Schema patches are rare; prefer declarative schema
for standard table changes.

### Patch Dependencies and Aliases

Implement `getDependencies()` to declare ordering between patches within the
same module. Return `getAliases()` with the old class name when renaming a
patch to prevent re-execution.

### Conventions

- Define all table structures in db_schema.xml — never use InstallSchema or UpgradeSchema
  Example: etc/db_schema.xml with <table name="vendor_module_entity"> containing column and constraint definitions
  Rationale: Declarative schema is the only supported approach since Magento 2.3. Legacy scripts cannot be automatically reversed during module uninstall and are not analyzed by the schema diff engine.
- Regenerate db_schema_whitelist.json after every schema change
  Example: bin/magento setup:db-declaration:generate-whitelist --module-name=Vendor_Module
  Rationale: The whitelist tells Magento which schema elements your module owns. Without it, setup:upgrade cannot safely drop removed columns during uninstall, and CI pipelines will fail schema validation.
- Make every data patch idempotent with existence checks before inserts or updates
  Example: Check if an attribute exists before calling addAttribute() inside the patch apply() method
  Rationale: Patches can re-run after failures or database restores. Non-idempotent patches cause duplicate key errors or corrupted data that requires manual database cleanup.

### Examples

#### db_schema.xml table definition

Complete declarative schema defining a custom entity table with primary key, columns, index, and foreign key constraint

```xml
<?xml version="1.0"?>
<schema xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Setup/Declaration/Schema/etc/schema.xsd">
    <table name="vendor_module_entity" resource="default" engine="innodb"
           comment="Vendor Module Entity Table">
        <column xsi:type="int" name="entity_id" unsigned="true" nullable="false"
                identity="true" comment="Entity ID"/>
        <column xsi:type="varchar" name="name" nullable="false" length="255"
                comment="Entity Name"/>
        <column xsi:type="smallint" name="store_id" unsigned="true" nullable="false"
                default="0" comment="Store ID"/>
        <column xsi:type="timestamp" name="created_at" nullable="false"
                default="CURRENT_TIMESTAMP" comment="Created At"/>
        <constraint xsi:type="primary" referenceId="PRIMARY">
            <column name="entity_id"/>
        </constraint>
        <index referenceId="VENDOR_MODULE_ENTITY_STORE_ID" indexType="btree">
            <column name="store_id"/>
        </index>
        <constraint xsi:type="foreign" referenceId="VENDOR_MODULE_ENTITY_STORE_ID_STORE_STORE_ID"
                    table="vendor_module_entity" column="store_id"
                    referenceTable="store" referenceColumn="store_id"
                    onDelete="CASCADE"/>
    </table>
</schema>
```

#### Data patch with idempotent checks

Data patch that adds a product attribute, checking for existence before creation to ensure safe re-execution

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Setup\Patch\Data;

use Magento\Eav\Setup\EavSetup;
use Magento\Eav\Setup\EavSetupFactory;
use Magento\Framework\Setup\ModuleDataSetupInterface;
use Magento\Framework\Setup\Patch\DataPatchInterface;

class AddCustomProductAttribute implements DataPatchInterface
{
    public function __construct(
        private readonly ModuleDataSetupInterface $moduleDataSetup,
        private readonly EavSetupFactory $eavSetupFactory
    ) {
    }

    public function apply(): self
    {
        /** @var EavSetup $eavSetup */
        $eavSetup = $this->eavSetupFactory->create(['setup' => $this->moduleDataSetup]);

        // Idempotent: skip if attribute already exists
        if ($eavSetup->getAttributeId(\Magento\Catalog\Model\Product::ENTITY, 'custom_flag')) {
            return $this;
        }

        $eavSetup->addAttribute(
            \Magento\Catalog\Model\Product::ENTITY,
            'custom_flag',
            [
                'type' => 'int',
                'label' => 'Custom Flag',
                'input' => 'boolean',
                'source' => \Magento\Eav\Model\Entity\Attribute\Source\Boolean::class,
                'required' => false,
                'default' => '0',
                'global' => \Magento\Eav\Model\Entity\Attribute\ScopedAttributeInterface::SCOPE_STORE,
                'visible' => true,
                'searchable' => false,
                'filterable' => false,
                'comparable' => false,
                'used_in_product_listing' => false,
            ]
        );

        return $this;
    }

    public static function getDependencies(): array
    {
        return [];
    }

    public function getAliases(): array
    {
        return [];
    }
}
```

#### db_schema_whitelist.json

Auto-generated whitelist file that tracks module-owned schema elements for safe uninstallation

```json
{
  "vendor_module_entity": {
    "column": {
      "entity_id": true,
      "name": true,
      "store_id": true,
      "created_at": true
    },
    "index": {
      "VENDOR_MODULE_ENTITY_STORE_ID": true
    },
    "constraint": {
      "PRIMARY": true,
      "VENDOR_MODULE_ENTITY_STORE_ID_STORE_STORE_ID": true
    }
  }
}
```


### Anti-patterns

- Using InstallSchema or UpgradeSchema classes in new modules: Legacy setup scripts run procedurally and cannot be reversed by the framework. Magento cannot diff the intended schema state, so uninstallation leaves orphaned tables and columns. CI tools that validate schema integrity flag legacy scripts as violations.
  Solution: Define all table structures in etc/db_schema.xml and run setup:db-declaration:generate-whitelist to produce the whitelist. Remove any Setup/InstallSchema.php or Setup/UpgradeSchema.php files.
- Editing db_schema_whitelist.json manually: Manual edits can list schema elements the module does not own or omit elements it does own. This causes setup:upgrade to either skip necessary drops or accidentally drop columns belonging to other modules.
  Solution: Always regenerate the whitelist with the CLI command: bin/magento setup:db-declaration:generate-whitelist --module-name=Vendor_Module. Commit the regenerated file.
- Non-idempotent data patches that fail on re-execution: Data patches without existence checks throw duplicate key or integrity constraint exceptions when re-run after partial failures or database restores. The patch_list table marks them as applied, but the data operation was incomplete.
  Solution: Add explicit existence checks before every insert or attribute creation:
if ($eavSetup->getAttributeId(Product::ENTITY, 'my_attr')) {
    return $this;
}
Wrap bulk inserts in a transaction and check for existing rows first.


### File Templates

#### etc/db_schema.xml

Path template:

```text
etc/db_schema.xml
```

Declarative schema definition for module database tables

```xml
<?xml version="1.0"?>
<schema xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Setup/Declaration/Schema/etc/schema.xsd">
    <table name="{{vendor}}_{{module}}_entity" resource="default" engine="innodb"
           comment="{{module}} Entity Table">
        <column xsi:type="int" name="entity_id" unsigned="true" nullable="false"
                identity="true" comment="Entity ID"/>
        <constraint xsi:type="primary" referenceId="PRIMARY">
            <column name="entity_id"/>
        </constraint>
    </table>
</schema>
```

#### Setup/Patch/Data/<patchName>.php

Path template:

```text
Setup/Patch/Data/{{patchName}}.php
```

Data patch template with idempotent apply method and dependency declarations

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Setup\Patch\Data;

use Magento\Framework\Setup\ModuleDataSetupInterface;
use Magento\Framework\Setup\Patch\DataPatchInterface;

class {{patchName}} implements DataPatchInterface
{
    public function __construct(
        private readonly ModuleDataSetupInterface $moduleDataSetup
    ) {
    }

    public function apply(): self
    {
        // Implement idempotent data migration here
        return $this;
    }

    public static function getDependencies(): array
    {
        return [];
    }

    public function getAliases(): array
    {
        return [];
    }
}
```


### References

- [Adobe Commerce: Declarative schema configuration](https://developer.adobe.com/commerce/php/development/components/declarative-schema/configuration/)
- [Adobe Commerce: Data and schema patches](https://developer.adobe.com/commerce/php/development/components/declarative-schema/patches/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x declarative schema and patch docs
