---
name: admin-ui-grid
description: "Build Magento 2 admin grids using UI Component listing XML, data providers, and admin controllers with proper ACL integration"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Admin UI Grid

### Activation

#### Use When

- The task is to create or modify a Magento admin listing grid, mass action, grid controller, or UI component data provider.
- The task mentions adminhtml UI components, listing XML, ACL-protected admin routes, collection factories, or grid columns.

#### Do Not Use When

- The task is a storefront Hyva or Luma UI change with no admin grid surface.
- The task is only a generic repository, API, or schema change without adminhtml listing behavior.

#### Required Inputs

- Entity name, database table or collection class, admin route/frontName, and desired columns or filters.
- ACL resource and menu placement, or enough existing module context to infer them safely.

### Workflow

1. Inspect existing adminhtml routes, acl.xml, menu.xml, layout handles, UI component naming, and collection/data provider registrations.
2. Create or update the listing XML, data source, collection factory wiring, controller, layout handle, ACL, and menu in one coherent vertical slice.
3. Keep data source names, listing names, collection aliases, and layout handles exactly aligned.
4. Add mass actions or inline editing only when the task explicitly requires them, and route each write action through ACL-protected controllers.

### Guardrails

- Do not add admin controllers without an explicit ACL mechanism accepted by the target Magento version and project convention.
- Do not expose unfiltered large collections; grids must support paging, filtering, and sorting through the data provider.
- Ask before adding destructive mass actions such as delete, bulk status reset, or export of sensitive data. (approval required)

### Verification

- Run XML validation or the project equivalent for view/adminhtml/ui_component, layout, acl.xml, menu.xml, and di.xml.
- Run bin/magento setup:di:compile or the project wrapper when constructor or di.xml wiring changes.
- Manually smoke the admin route when a browser/session is available; otherwise report that UI rendering was not verified.

### Output Contract

- List every admin route, ACL resource, UI component name, data source name, and collection class touched.
- Report verification commands run and whether the grid UI was browser-tested.

### Admin Grid Architecture

Admin grids in Magento 2 are built with the UI Component framework. A grid
requires three coordinated pieces: a listing XML file that defines columns and
filters, a data provider that supplies the collection, and a controller action
with a layout handle that loads the UI component.

### Listing XML Structure

Create the listing file at `view/adminhtml/ui_component/<entity>_listing.xml`.
The root `<listing>` element contains `<dataSource>`, `<listingToolbar>`, and
`<columns>` sections. The data source binds to a data provider class. The
toolbar configures bookmarks, column controls, filters, paging, and mass
actions. Each `<column>` defines the field name, data type, label, and
optional filter/sorting configuration.

### Data Provider

The data provider class extends
`Magento\Framework\View\Element\UiComponent\DataProvider\DataProvider` or
implements `DataProviderInterface`. Register it via `di.xml` by adding the
collection to `Magento\Framework\View\Element\UiComponent\DataProvider\CollectionFactory`
arguments. The collection name in di.xml must match the `<dataSource>` name in
the listing XML suffixed with `_data_source`.

### Controller and Layout

Create an admin controller at `Controller/Adminhtml/<Entity>/Index.php` that
returns a `resultPageFactory->create()` response. The layout handle
`view/adminhtml/layout/<route>_<entity>_index.xml` must reference the listing
UI component via `<uiComponent name="<entity>_listing"/>`.

### ACL and Menu Integration

Define ACL resources in `etc/acl.xml` and reference them in the controller's
`ADMIN_RESOURCE` constant. Add a menu item in `etc/adminhtml/menu.xml` that
maps to the controller route so the grid is accessible from the admin sidebar.

### Mass Actions and Inline Editing

Add mass actions to the toolbar for bulk operations like delete or status
change. Each mass action maps to a dedicated controller action. Enable inline
editing by adding the `editor` configuration to columns that support it.

### Conventions

- Name the listing XML file as <entity>_listing.xml matching the database entity name
  Example: vendor_module_entity_listing.xml for the vendor_module_entity table
  Rationale: Consistent naming between the listing file, data source, and collection factory registration prevents the common 'data source not found' configuration error.
- Always protect admin controllers with an ADMIN_RESOURCE constant referencing an ACL resource
  Example: const ADMIN_RESOURCE = 'Vendor_Module::entity_manage';
  Rationale: Without ACL protection, any admin user can access the grid regardless of role permissions. Magento's admin routing skips controllers that lack the resource constant.
- Register the grid collection in di.xml under CollectionFactory arguments with the exact data source name
  Example: <item name="vendor_module_entity_listing_data_source" xsi:type="string">Vendor\Module\Model\ResourceModel\Entity\Grid\Collection</item>
  Rationale: The UI component framework resolves the data provider by looking up this exact key. A mismatch causes a blank grid with no error in the UI.

### Examples

#### Listing XML with toolbar and columns

Complete admin grid UI component defining data source, toolbar with filters and paging, and typed columns with sorting

```xml
<?xml version="1.0" encoding="UTF-8"?>
<listing xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="urn:magento:module:Magento_Ui:etc/ui_configuration.xsd">
    <argument name="data" xsi:type="array">
        <item name="js_config" xsi:type="array">
            <item name="provider"
                  xsi:type="string">vendor_module_entity_listing.vendor_module_entity_listing_data_source</item>
        </item>
    </argument>

    <settings>
        <spinner>vendor_module_entity_columns</spinner>
        <deps>
            <dep>vendor_module_entity_listing.vendor_module_entity_listing_data_source</dep>
        </deps>
    </settings>

    <dataSource name="vendor_module_entity_listing_data_source" component="Magento_Ui/js/grid/provider">
        <settings>
            <updateUrl path="mui/index/render"/>
        </settings>
        <aclResource>Vendor_Module::entity_view</aclResource>
        <dataProvider class="Magento\Framework\View\Element\UiComponent\DataProvider\DataProvider"
                      name="vendor_module_entity_listing_data_source">
            <settings>
                <requestFieldName>id</requestFieldName>
                <primaryFieldName>entity_id</primaryFieldName>
            </settings>
        </dataProvider>
    </dataSource>

    <listingToolbar name="listing_top">
        <bookmark name="bookmarks"/>
        <columnsControls name="columns_controls"/>
        <filterSearch name="fulltext"/>
        <filters name="listing_filters"/>
        <paging name="listing_paging"/>
    </listingToolbar>

    <columns name="vendor_module_entity_columns">
        <selectionsColumn name="ids" sortOrder="10">
            <settings>
                <indexField>entity_id</indexField>
            </settings>
        </selectionsColumn>
        <column name="entity_id" sortOrder="20">
            <settings>
                <filter>textRange</filter>
                <label translate="true">ID</label>
                <sorting>asc</sorting>
            </settings>
        </column>
        <column name="name" sortOrder="30">
            <settings>
                <filter>text</filter>
                <label translate="true">Name</label>
            </settings>
        </column>
        <column name="created_at" class="Magento\Ui\Component\Listing\Columns\Date"
                component="Magento_Ui/js/grid/columns/date" sortOrder="40">
            <settings>
                <filter>dateRange</filter>
                <dataType>date</dataType>
                <label translate="true">Created At</label>
            </settings>
        </column>
    </columns>
</listing>
```

#### Admin controller with ACL

Index controller that loads the admin page layout and enforces ACL-based access control

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Controller\Adminhtml\Entity;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;
use Magento\Framework\View\Result\Page;

class Index extends Action
{
    public const ADMIN_RESOURCE = 'Vendor_Module::entity_manage';

    public function __construct(
        Context $context,
        private readonly PageFactory $resultPageFactory
    ) {
        parent::__construct($context);
    }

    public function execute(): Page
    {
        $resultPage = $this->resultPageFactory->create();
        $resultPage->setActiveMenu('Vendor_Module::entity');
        $resultPage->getConfig()->getTitle()->prepend(__('Manage Entities'));

        return $resultPage;
    }
}
```

#### Layout handle referencing UI component

Admin layout XML that loads the listing UI component into the page content area

```xml
<?xml version="1.0"?>
<page xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="urn:magento:framework:View/Layout/etc/page_configuration.xsd">
    <body>
        <referenceContainer name="content">
            <uiComponent name="vendor_module_entity_listing"/>
        </referenceContainer>
    </body>
</page>
```


### Anti-patterns

- Missing data source registration in di.xml CollectionFactory arguments: The grid renders with no rows and no visible error. The UI component framework silently falls back to an empty data set when the collection factory cannot resolve the data source name.
  Solution: Register the collection in di.xml:
<type name="Magento\Framework\View\Element\UiComponent\DataProvider\CollectionFactory">
    <arguments>
        <argument name="collections" xsi:type="array">
            <item name="vendor_module_entity_listing_data_source"
                  xsi:type="string">Vendor\Module\Model\ResourceModel\Entity\Grid\Collection</item>
        </argument>
    </arguments>
</type>

- Mixing form and listing UI components in the same XML file: The UI component framework expects distinct root elements (<listing> vs <form>). Mixing them causes schema validation failures and unpredictable JavaScript initialization errors in the admin panel.
  Solution: Create separate XML files: <entity>_listing.xml for the grid and <entity>_form.xml for the edit form. Reference each from its own layout handle.
- Admin controller without ADMIN_RESOURCE constant: Without ADMIN_RESOURCE, Magento cannot enforce role-based access control. Every admin user gains access to the grid regardless of their ACL permissions, violating the principle of least privilege.
  Solution: Define the ADMIN_RESOURCE constant in every admin controller and create matching ACL entries in etc/acl.xml.

### File Templates

#### view/adminhtml/ui_component/<entity>_listing.xml

Path template:

```text
view/adminhtml/ui_component/{{entity}}_listing.xml
```

UI Component listing XML defining data source, toolbar, and column configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<listing xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="urn:magento:module:Magento_Ui:etc/ui_configuration.xsd">
    <argument name="data" xsi:type="array">
        <item name="js_config" xsi:type="array">
            <item name="provider"
                  xsi:type="string">{{entity}}_listing.{{entity}}_listing_data_source</item>
        </item>
    </argument>
    <settings>
        <spinner>{{entity}}_columns</spinner>
        <deps>
            <dep>{{entity}}_listing.{{entity}}_listing_data_source</dep>
        </deps>
    </settings>
</listing>
```

#### Controller/Adminhtml/<entityClass>/Index.php

Path template:

```text
Controller/Adminhtml/{{entityClass}}/Index.php
```

Admin grid index controller with ACL protection and page layout initialization

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Controller\Adminhtml\{{entityClass}};

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;
use Magento\Framework\View\Result\Page;

class Index extends Action
{
    public const ADMIN_RESOURCE = '{{vendor}}_{{module}}::{{entity}}_manage';

    public function __construct(
        Context $context,
        private readonly PageFactory $resultPageFactory
    ) {
        parent::__construct($context);
    }

    public function execute(): Page
    {
        $resultPage = $this->resultPageFactory->create();
        $resultPage->setActiveMenu('{{vendor}}_{{module}}::{{entity}}');
        $resultPage->getConfig()->getTitle()->prepend(__('Manage {{entityLabel}}'));

        return $resultPage;
    }
}
```


### References

- [Adobe Commerce: UI Components listing](https://developer.adobe.com/commerce/frontend-core/ui-components/components/listing-grid/)
- [Adobe Commerce: Admin controllers](https://developer.adobe.com/commerce/php/development/components/routing/custom-admin-router/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce 2.4.x UI components and admin routing docs
