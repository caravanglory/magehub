---
name: hyva-module-compatibility
description: "Adapt Luma-oriented Magento 2 modules to work with Hyva themes — replace RequireJS and Knockout with Alpine.js, Tailwind CSS, and ViewModels"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Hyva Module Compatibility

### Activation

#### Use When

- The task is to adapt a Luma-oriented Magento module, template, layout, or JavaScript behavior for Hyva.
- The task mentions Hyva, Alpine.js, Tailwind CSS, ViewModels, private content, or removing RequireJS/Knockout dependencies.

#### Do Not Use When

- The storefront is still Luma-only and the task explicitly targets Knockout, RequireJS, or LESS implementation.
- The task is an adminhtml UI component or backend-only module change.

#### Required Inputs

- Affected frontend route/template/layout handle, target Hyva theme or compatibility module, and existing Luma dependencies to replace.
- Whether the compatibility layer should live in the theme override or a dedicated module.

### Workflow

1. Inspect existing layout XML, PHTML, JS dependencies, customer-data usage, block methods, and theme/module ownership.
2. Remove or replace Luma-only blocks and scripts with Hyva-compatible PHTML, Alpine.js, Tailwind classes, and ViewModels.
3. Keep dynamic customer-specific data out of cacheable HTML; use private content events or Hyva helpers.
4. Verify responsive storefront behavior and ensure Luma compatibility is not broken unless the task explicitly deprecates it.

### Guardrails

- Do not ship RequireJS, Knockout, jQuery UI, or LESS-only assumptions in Hyva paths.
- Do not place sensitive or customer-specific data into full-page-cacheable markup.
- Ask before removing Luma compatibility from the base module. (approval required)

### Verification

- Run the project frontend build or static-content command when templates, Tailwind config, or CSS assets change.
- Run targeted PHP tests for ViewModels or services when business logic moves out of blocks/templates.
- Browser-smoke the affected Hyva page at desktop and mobile widths when a local storefront is available.

### Output Contract

- List the Luma dependencies removed, Hyva replacements added, cache/private-content handling, and storefront verification performed.
- State whether changes live in a theme override, compatibility module, or base module.

### Hyva Compatibility Overview

Hyva themes replace Magento's Luma frontend stack entirely. RequireJS,
Knockout.js, jQuery UI, and the default LESS compilation pipeline are not
loaded. Modules that depend on any of these technologies need a separate set
of frontend templates to work under Hyva.

### Alpine.js for Interactivity

Replace Knockout view models and jQuery widgets with Alpine.js components.
Declare component state using `x-data` and bind behavior with `@click`,
`x-show`, `x-bind`, and `x-transition`. Keep Alpine components small and
co-located with their template — avoid centralizing all state into a single
massive component.

### Tailwind CSS for Styling

Hyva uses Tailwind CSS instead of LESS/CSS modules. Apply utility classes
directly in templates. For module-specific styles, add custom utilities to
the Hyva theme's `tailwind.config.js` or use Tailwind's `@apply` directive
in a dedicated CSS file. Never ship Luma LESS files or inline styles that
conflict with Tailwind's reset.

### ViewModels over Block Methods

Hyva encourages using ViewModels (`Magento\Framework\View\Element\Block\ArgumentInterface`)
instead of adding methods to block classes. Inject ViewModels via layout XML
and access them in templates with `$block->getData('viewModel')` or the
`$viewModels->require()` helper. ViewModels are constructor-injectable
services that keep templates clean and logic testable.

### Layout XML Compatibility Layer

Create Hyva-compatible layout overrides in the theme or a compatibility
module. Use `<referenceBlock remove="true"/>` to suppress Luma blocks that
load RequireJS components, then add replacement blocks that use Alpine.js
templates. Place Hyva-specific layout files under the Hyva theme's module
override directory or in a dedicated compatibility module that depends on
`Hyva_Theme`.

### JavaScript Event Integration

Hyva provides a `private-content-loaded` event and custom `hyva.on()` /
`hyva.getBrowserStorage()` utilities. Use these instead of
`customerData.get()` and `require(['Magento_Customer/js/...'])` for
private content sections. Listen for section updates with Alpine `x-init`
or vanilla event listeners.

### Conventions

- Create a separate Hyva compatibility module rather than conditionally branching in the main module
  Example: Vendor_ModuleHyva depends on Vendor_Module and Hyva_Theme, containing only Hyva-specific templates and layout
  Rationale: A dedicated compatibility module keeps the Luma templates untouched, avoids runtime theme detection overhead, and allows stores to install the compatibility layer only when Hyva is active.
- Use ViewModels for all template data access instead of adding public methods to block classes
  Example: $viewModels->require(Vendor\Module\ViewModel\ProductData::class)->getFormattedPrice()
  Rationale: ViewModels are lightweight, constructor-injectable services. Block methods are inherited and can conflict when blocks are substituted. ViewModels are also easier to unit test because they have no template rendering dependencies.
- Replace every RequireJS dependency and Knockout binding with an Alpine.js equivalent
  Example: Replace data-bind="text: price" with x-text="price" inside an x-data component
  Rationale: Hyva does not load RequireJS or Knockout. Leftover bindings and require() calls cause silent JavaScript errors and non-functional UI in the storefront.

### Examples

#### Alpine.js component replacing Knockout widget

Interactive product quantity selector built with Alpine.js x-data, replacing the Luma Knockout-based qty widget

```html
<div x-data="initQtySelector()" class="flex items-center gap-2">
  <button
    @click="decrement"
    :disabled="qty <= 1"
    class="px-3 py-1 border rounded disabled:opacity-50"
    aria-label="Decrease quantity"
  >
    -
  </button>
  <input
    type="number"
    x-model.number="qty"
    min="1"
    :max="maxQty"
    name="qty"
    class="w-16 text-center border rounded py-1"
    aria-label="Quantity"
  />
  <button
    @click="increment"
    :disabled="qty >= maxQty"
    class="px-3 py-1 border rounded disabled:opacity-50"
    aria-label="Increase quantity"
  >
    +
  </button>
</div>

<script>
  function initQtySelector() {
    return {
      qty: 1,
      maxQty: 100,
      increment() {
        if (this.qty < this.maxQty) this.qty++;
      },
      decrement() {
        if (this.qty > 1) this.qty--;
      },
    };
  }
</script>
```

#### ViewModel with layout XML injection

ViewModel class providing formatted data to templates, injected via layout XML arguments

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\ViewModel;

use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Pricing\PriceCurrencyInterface;
use Magento\Framework\View\Element\Block\ArgumentInterface;

class ProductData implements ArgumentInterface
{
    public function __construct(
        private readonly ProductRepositoryInterface $productRepository,
        private readonly PriceCurrencyInterface $priceCurrency
    ) {
    }

    public function getFormattedPrice(int $productId): string
    {
        try {
            $product = $this->productRepository->getById($productId);
        } catch (NoSuchEntityException) {
            return '';
        }

        return $this->priceCurrency->format(
            (float) $product->getFinalPrice(),
            true,
            PriceCurrencyInterface::DEFAULT_PRECISION
        );
    }
}
```

#### Hyva-compatible layout XML override

Layout XML that removes Luma blocks relying on RequireJS and adds Hyva-compatible replacements with Alpine.js templates

```xml
<?xml version="1.0"?>
<page xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="urn:magento:framework:View/Layout/etc/page_configuration.xsd">
    <body>
        <!-- Remove Luma block that depends on RequireJS -->
        <referenceBlock name="vendor.module.luma.widget" remove="true"/>

        <!-- Add Hyva-compatible replacement with ViewModel -->
        <referenceContainer name="content">
            <block class="Magento\Framework\View\Element\Template"
                   name="vendor.module.hyva.widget"
                   template="Vendor_ModuleHyva::widget.phtml">
                <arguments>
                    <argument name="view_model"
                              xsi:type="object">Vendor\Module\ViewModel\ProductData</argument>
                </arguments>
            </block>
        </referenceContainer>
    </body>
</page>
```


### Anti-patterns

- Leaving RequireJS require() calls or Knockout data-bind attributes in Hyva templates: Hyva does not load RequireJS or Knockout. These bindings silently fail — no JavaScript errors appear in the console, but the UI elements they control render static and non-functional.
  Solution: Replace every require() call with an Alpine.js component using x-data. Replace every data-bind attribute with the Alpine equivalent (x-text, x-show, x-bind, @click). Test all interactive elements under the Hyva theme.
- Adding block methods for template data instead of using ViewModels: Block methods are inherited through the block class hierarchy and can collide when Hyva substitutes block classes. Blocks also carry template rendering state that makes them hard to unit test.
  Solution: Create a ViewModel implementing ArgumentInterface:
class ProductData implements ArgumentInterface
Inject it via layout XML and access in template:
$viewModels->require(ProductData::class)->getData()

- Shipping Luma LESS files or inline CSS that conflicts with Tailwind's reset: Tailwind applies a CSS reset (Preflight) that strips default margins, padding, and list styles. Luma LESS assumes browser defaults, so imported Luma styles render incorrectly — misaligned elements, missing spacing, unstyled lists.
  Solution: Rewrite all styles using Tailwind utility classes applied directly in templates. For complex styles, use @apply in a dedicated CSS file loaded through the Hyva theme's build pipeline.

### File Templates

#### view/frontend/templates/<widgetName>.phtml

Path template:

```text
view/frontend/templates/{{widgetName}}.phtml
```

Hyva-compatible template using Alpine.js for interactivity and Tailwind for styling

```text
<?php
declare(strict_types=1);

/** @var \Magento\Framework\View\Element\Template $block */
/** @var \Vendor\Module\ViewModel\ProductData $viewModel */
$viewModel = $block->getData('view_model');
?>
<div x-data="{ open: false }" class="p-4 border rounded">
    <button @click="open = !open" class="px-4 py-2 bg-blue-600 text-white rounded">
        <?= $block->escapeHtml(__('Toggle')) ?>
    </button>
    <div x-show="open" x-transition class="mt-2">
        <?= $block->escapeHtml($viewModel->getFormattedPrice(1)) ?>
    </div>
</div>
```

#### ViewModel/<viewModelName>.php

Path template:

```text
ViewModel/{{viewModelName}}.php
```

ViewModel providing data to Hyva templates without block class dependencies

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\ViewModel;

use Magento\Framework\View\Element\Block\ArgumentInterface;

class {{viewModelName}} implements ArgumentInterface
{
    public function getData(): array
    {
        return [];
    }
}
```


### References

- [Hyva Themes documentation](https://docs.hyva.io/)
- [Hyva compatibility module guide](https://docs.hyva.io/hyva-themes/writing-compatible-extensions/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Hyva theme compatibility guidance, Adobe Commerce 2.4.x frontend and cache docs
