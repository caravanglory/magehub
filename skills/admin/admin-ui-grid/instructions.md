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
