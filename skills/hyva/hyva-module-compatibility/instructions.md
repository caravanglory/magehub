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
