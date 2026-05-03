# MageHub - Project Proposal

> A curated collection of AI coding skills for Magento 2 development

**Version:** 1.0.0-draft  
**Date:** 2026-03-19  
**Author:** MageHub Team  
**License:** MIT

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Skill System Design](#2-skill-system-design)
3. [Complete Skill Catalog](#3-complete-skill-catalog)
4. [YAML Schema Specification](#4-yaml-schema-specification)
5. [CLI Design](#5-cli-design)
6. [Tool Compatibility](#6-tool-compatibility)
7. [Project Structure](#7-project-structure)
8. [Technical Stack](#8-technical-stack)
9. [Implementation Plan](#9-implementation-plan)
10. [Future Roadmap](#10-future-roadmap)
11. [Appendix A: Skill Writing Guidelines](#appendix-a-skill-writing-guidelines)
12. [Appendix B: Glossary](#appendix-b-glossary)
13. [Appendix C: FAQ](#appendix-c-faq)

---

## 1. Project Overview

### 1.1 What is MageHub?

MageHub is an open-source collection of AI coding skills (structured prompts + conventions) specifically designed for Magento 2 development. It helps AI coding assistants understand Magento 2's unique architecture, conventions, and best practices.

### 1.2 Problem Statement

AI coding tools like Claude Code, Cursor, and OpenCode are powerful but lack specialized knowledge about:

- Magento 2's complex architecture (DI, plugins, observers, service contracts)
- Magento-specific conventions (module structure, naming, XML configurations)
- Ecosystem tools (Hyva, PWA Studio, Adobe Commerce Cloud)
- Upgrade paths and compatibility concerns
- Performance optimization specific to Magento

### 1.3 Solution

MageHub provides:

1. **Curated Skills** — Expert knowledge packaged as structured prompts
2. **Dual Format** — YAML (source of truth) + Markdown (human-readable)
3. **CLI Tool** — Magento-style commands (`skill:install`, `skill:list`)
4. **Multi-Tool Support** — Works with Claude Code, OpenCode, Cursor, Codex, Qoder, Trae

### 1.4 Target Users

- Magento 2 developers using AI coding assistants
- Development teams wanting consistent AI-assisted development
- Agencies managing multiple Magento projects
- Solo developers learning Magento 2

### 1.5 Key Features

| Feature             | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| Skill Library       | 10 core skills in v1.0, growing to 50+ across all Magento 2 domains |
| CLI Tool            | Magento-style commands (`skill:install`, `skill:list`)              |
| Multi-Format Export | Generate context files for any supported AI tool                    |
| Skill Composition   | Combine multiple skills into a single context file                  |
| Version Management  | Track skill versions independently                                  |
| Offline Support     | All v1.0 skills bundled with CLI, work fully offline                |

---

### 1.6 Scope & Non-goals (v1.0)

**In scope:**

- Local CLI that installs skills, generates context files, and validates skill YAML
- 10 bundled core skills (no network dependency, fully offline)
- Output formats for Claude Code, OpenCode, Cursor, Codex, Qoder, and Trae
- Schema validation for skill YAML and project config

**Out of scope (planned for v1.1+):**

- Remote skill registries, downloading, and caching
- Signature verification and checksum manifests for remote skills
- Interactive setup wizard
- Skill bundles (pre-defined skill combinations)
- IDE extensions (VS Code, JetBrains)
- Web dashboard and hosted skill marketplace
- Automatic Magento code generation or project scaffolding

### 1.7 Assumptions

- Users already have a Magento 2 codebase and an AI tool installed
- Skills are consumed as context files, not executed code
- Remote skills are opt-in and can be restricted by allowlist

## 2. Skill System Design

### 2.1 Skill Definition

A **skill** is a self-contained unit of knowledge that teaches an AI assistant how to perform a specific Magento 2 development task.

Every skill **must** include the schema-required core fields:

- **ID / Name / Version / Category / Description** — Identity and metadata
- **Instructions** — Step-by-step guidance in Markdown

For high-quality bundled skills, the following sections are **strongly recommended** and expected for all core v1.0 skills:

- **Conventions** — Rules and patterns to follow
- **Examples** — Code samples and templates
- **Anti-patterns** — What to avoid
- **References** — Links to official documentation

### 2.2 Skill Categories

| Category            | Code          | Description                      |
| ------------------- | ------------- | -------------------------------- |
| Module Development  | `module`      | Core module development patterns |
| API Development     | `api`         | REST and GraphQL APIs            |
| Admin & Backend     | `admin`       | Admin panel development          |
| Frontend & Theme    | `frontend`    | Luma theme development           |
| Hyva Ecosystem      | `hyva`        | Hyva theme and checkout          |
| Testing             | `testing`     | All types of testing             |
| Performance         | `performance` | Performance optimization         |
| Upgrade & Migration | `upgrade`     | Version upgrades and migrations  |
| DevOps              | `devops`      | Deployment and infrastructure    |
| Standards           | `standards`   | Coding standards and tools       |

### 2.3 Skill Naming Convention

```
<category>-<specific-topic>[-<variant>]
```

**Examples:**

- `module-scaffold` — Module scaffolding
- `hyva-alpine-components` — Hyva Alpine.js components
- `upgrade-2.4.6-to-2.4.7` — Specific version upgrade

### 2.4 Skill Versioning

Each skill has an independent version following SemVer:

- **Major** — Breaking changes to skill structure
- **Minor** — New instructions or examples added
- **Patch** — Fixes and clarifications

Deprecated skills remain installable for one minor release with a deprecation notice, then removed in the next major release.

### 2.5 Skill Composition

Skills can be combined for comprehensive coverage:

```yaml
# .magehub.yaml
skills:
  - module-plugin
  - module-di
  - performance
  - standards-coding
```

The CLI merges these into a single context file.

**Heading Level Strategy:**

When merging multiple skills into one output file, heading levels must be normalized to avoid conflicts:

- The **output template** owns `#` (h1) and `##` (h2) for the document title and skill section headers.
- Each skill's `instructions` field must start headings at **`###` (h3)** or deeper.
- During merge, the formatter validates heading levels and shifts them down if a skill starts with `#` or `##`.
- A `skill:verify` warning is emitted if a skill's instructions contain `#` or `##` headings.

### 2.6 Skill Distribution Strategy

MageHub uses a **hybrid distribution model**:

#### Core Skills (Bundled with npm package — v1.0)

- 10 MVP skills shipped with the CLI
- Zero network dependency, work offline
- Updated with each npm package release

#### Remote Skills (Downloaded on demand — Planned for v1.1+)

> **Note:** Remote skill support is **not included in v1.0**. The design below is included for reference and will be implemented in v1.1.

- Community-contributed skills
- Enterprise private skill repositories
- Third-party extension author skills
- Cached locally at `~/.magehub/cache/skills/`

**Trust & Security (Remote Skills):**

- Remote repositories must be explicitly allowed (allowlist in config)
- Downloaded skills are checksummed and recorded in a local manifest
- Optional signature verification for official/community registries

**Example (.magehub.yaml):**

```yaml
version: '1'

registries:
  - name: community
    url: https://github.com/magehub/skills
  - name: acme-private
    url: https://github.com/acme/magehub-skills
    public_key: 'ed25519:...'

allowlist:
  - community/*
  - acme-private/payment-*
```

```bash
# Core skills - instant, no network needed
magehub skill:install module-plugin

# Remote skills - downloaded from GitHub
magehub skill:install community/some-skill

# Update remote skills cache
magehub skill:update
```

---

## 3. Complete Skill Catalog

> **v1.0 ships 10 core skills** selected for maximum daily-development value. The remaining skills are documented here as a reference catalog and will be implemented incrementally in v1.1+.

### 3.0 MVP Skill Summary (v1.0)

| #   | Skill ID                    | Category    | Selection Rationale                                                           |
| --- | --------------------------- | ----------- | ----------------------------------------------------------------------------- |
| 1   | `module-scaffold`           | module      | Foundation — every project starts here                                        |
| 2   | `module-plugin`             | module      | Most-used extension mechanism; AI struggles with signatures                   |
| 3   | `module-di`                 | module      | Core architecture (di.xml, preferences, virtualTypes) — AI blind spot         |
| 4   | `module-setup`              | module      | Required for any DB work; declarative schema + data patches                   |
| 5   | `admin-ui-grid`             | admin       | Most complex and common admin UI pattern; XML-intensive                       |
| 6   | `api-graphql-resolver`      | api         | Modern headless/PWA standard API; unique resolver patterns                    |
| 7   | `hyva-module-compatibility` | hyva        | #1 Hyva ecosystem pain point: Luma-to-Hyva conversion                         |
| 8   | `testing-phpunit`           | testing     | Quality foundation; Magento's test setup is unique                            |
| 9   | `performance`               | performance | #1 performance lever; incorrect caching causes both perf and correctness bugs |
| 10  | `standards-coding`          | standards   | Affects every file; baseline for all other skills                             |

### 3.1 Module Development (`module`)

| Skill ID                  | Name                 | Description                                                                                 | Release  |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------- | -------- |
| `module-scaffold`         | Module Scaffolding   | Create standard Magento 2 module structure with registration.php, module.xml, composer.json | **v1.0** |
| `module-plugin`           | Plugin Development   | Before/After/Around plugin implementation with proper di.xml configuration                  | **v1.0** |
| `module-di`               | Dependency Injection | DI configuration, preferences, virtualTypes, argument replacement                           | **v1.0** |
| `module-setup`            | Setup Scripts        | Declarative schema, data patches, schema patches                                            | **v1.0** |
| `module-observer`         | Observer & Events    | Event dispatching and observer implementation patterns                                      | v1.1     |
| `module-service-contract` | Service Contracts    | Repository pattern, data interfaces, API contracts                                          | v1.1     |
| `module-cron`             | Cron Jobs            | Scheduled task implementation with crontab.xml                                              | v1.1     |
| `module-cli`              | CLI Commands         | Symfony Console commands for bin/magento                                                    | v1.1     |
| `module-acl`              | ACL & Permissions    | Admin permission configuration with acl.xml                                                 | v1.1     |
| `module-config`           | System Configuration | system.xml, config.xml, default values                                                      | v1.1     |
| `module-email`            | Email Templates      | Transactional email implementation                                                          | v1.2     |
| `module-logging`          | Logging & Debugging  | PSR-3 logging, debug techniques                                                             | v1.1     |

#### 3.1.1 Skill Detail: `module-scaffold`

**Purpose:** Guide AI to create a properly structured Magento 2 module from scratch.

**Key Instructions:**

- Module naming: `Vendor_ModuleName` (PascalCase)
- Required files: `registration.php`, `etc/module.xml`, `composer.json`
- Optional but recommended: `README.md`, `LICENSE`
- Sequence dependencies in `module.xml`
- PSR-4 autoloading in `composer.json`

**File Templates Included:**

- `registration.php`
- `etc/module.xml`
- `composer.json`
- Basic directory structure

**Conventions:**

- Use your actual vendor namespace (e.g., `Acme`, not `Vendor`)
- Module name should be descriptive (e.g., `CustomerRewards` not `Rewards`)
- Use `etc/` for all XML configuration
- Use `Model/`, `Api/`, `Block/`, `Controller/`, `Helper/`, `Observer/`, `Plugin/` directories as needed

---

#### 3.1.2 Skill Detail: `module-plugin`

**Purpose:** Teach AI to implement Magento 2 plugins (interceptors) correctly.

**Key Instructions:**

- Plugin types: `before`, `after`, `around`
- Plugin declaration in `etc/di.xml`
- Plugin class naming: `Vendor\Module\Plugin\{TargetClass}{MethodName}Plugin`
- Method signatures for each plugin type
- Sort order and plugin conflicts

**Code Examples:**

```php
// Before plugin
public function beforeSetName(
    \Magento\Catalog\Model\Product $subject,
    string $name
): array {
    return [strtoupper($name)];
}

// After plugin
public function afterGetName(
    \Magento\Catalog\Model\Product $subject,
    string $result
): string {
    return $result . ' - Modified';
}

// Around plugin
public function aroundSave(
    \Magento\Catalog\Model\Product $subject,
    callable $proceed
) {
    // Before
    $result = $proceed();
    // After
    return $result;
}
```

**Anti-patterns:**

- Avoid `around` plugins when `before`/`after` suffices
- Never plugin on `__construct`
- Avoid plugging into frequently called methods

---

### 3.2 API Development (`api`)

| Skill ID               | Name                     | Description                            | Release  |
| ---------------------- | ------------------------ | -------------------------------------- | -------- |
| `api-graphql-resolver` | GraphQL Resolver         | Custom GraphQL resolver implementation | **v1.0** |
| `api-graphql-schema`   | GraphQL Schema Extension | Extending existing GraphQL schema      | v1.1     |
| `api-graphql-mutation` | GraphQL Mutations        | Create, update, delete mutations       | v1.1     |
| `api-rest-endpoint`    | REST API Endpoint        | Custom REST API with webapi.xml        | v1.1     |
| `api-rest-acl`         | REST API Security        | ACL resources for API endpoints        | v1.1     |
| `api-authentication`   | API Authentication       | Token-based and OAuth authentication   | v1.2     |

#### 3.2.1 Skill Detail: `api-graphql-resolver`

**Purpose:** Guide AI to create GraphQL resolvers that follow Magento's patterns.

**Key Instructions:**

- Resolver interface: `Magento\Framework\GraphQl\Query\ResolverInterface`
- Schema file location: `etc/schema.graphqls`
- Resolver class location: `Model/Resolver/`
- Context and ResolveInfo usage
- Batch resolvers for performance

**Code Examples:**

```graphql
# etc/schema.graphqls
type Query {
  customProduct(sku: String!): CustomProduct
    @resolver(class: "Vendor\\Module\\Model\\Resolver\\CustomProduct")
}

type CustomProduct {
  sku: String
  name: String
  custom_attribute: String
}
```

```php
// Model/Resolver/CustomProduct.php
declare(strict_types=1);

class CustomProduct implements ResolverInterface
{
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $sku = $args['sku'];
        // Implementation
    }
}
```

---

### 3.3 Admin & Backend (`admin`)

| Skill ID            | Name             | Description                        | Release  |
| ------------------- | ---------------- | ---------------------------------- | -------- |
| `admin-ui-grid`     | Admin Grid       | UI Component grid with listing.xml | **v1.0** |
| `admin-ui-form`     | Admin Form       | UI Component form with form.xml    | v1.1     |
| `admin-controller`  | Admin Controller | Backend controller implementation  | v1.1     |
| `admin-menu`        | Admin Menu       | Menu configuration with menu.xml   | v1.1     |
| `admin-mass-action` | Mass Actions     | Bulk operations on grid items      | v1.1     |
| `admin-ui-modal`    | UI Modals        | Modal dialogs in admin             | v1.2     |

#### 3.3.1 Skill Detail: `admin-ui-grid`

**Purpose:** Create admin grid listings using UI Components.

**Key Instructions:**

- Data source configuration
- Column definitions (text, date, select, actions)
- Filters and search
- Sorting and pagination
- Inline editing
- Mass actions

**Files Involved:**

- `view/adminhtml/ui_component/{entity}_listing.xml`
- `Controller/Adminhtml/{Entity}/Index.php`
- `view/adminhtml/layout/{route_id}_{controller}_{action}.xml`

---

### 3.4 Frontend & Theme (`frontend`)

| Skill ID              | Name                    | Description                         | Release |
| --------------------- | ----------------------- | ----------------------------------- | ------- |
| `frontend-layout-xml` | Layout XML              | Layout handles and updates          | v1.1    |
| `frontend-blocks`     | Block Development       | Block classes and templates         | v1.1    |
| `frontend-phtml`      | PHTML Templates         | Template development best practices | v1.1    |
| `frontend-requirejs`  | RequireJS Configuration | JS module loading and dependencies  | v1.1    |
| `frontend-knockout`   | KnockoutJS Components   | UI components with KnockoutJS       | v1.2    |
| `frontend-less`       | LESS/CSS Development    | Styling with LESS                   | v1.2    |
| `frontend-js-widgets` | jQuery Widgets          | Magento jQuery widget pattern       | v1.2    |

---

### 3.5 Hyva Ecosystem (`hyva`)

| Skill ID                      | Name                 | Description                                     | Release  |
| ----------------------------- | -------------------- | ----------------------------------------------- | -------- |
| `hyva-module-compatibility`   | Module Compatibility | Make Luma modules work with Hyva                | **v1.0** |
| `hyva-alpine-components`      | Alpine.js Components | Interactive components with Alpine.js           | v1.1     |
| `hyva-tailwind-components`    | Tailwind Components  | Custom UI components with Tailwind CSS          | v1.1     |
| `hyva-layout-xml`             | Hyva Layout XML      | Hyva-specific layout configuration              | v1.1     |
| `hyva-svg-icons`              | SVG Icon System      | Heroicons and custom SVG integration            | v1.1     |
| `hyva-purge-config`           | Tailwind Purge       | CSS purge optimization                          | v1.2     |
| `hyva-checkout-customization` | Checkout Basics      | Basic Hyva Checkout customization with Magewire | v1.1     |
| `hyva-checkout-payment`       | Payment Methods      | Add custom payment to Hyva Checkout             | v1.1     |
| `hyva-checkout-shipping`      | Shipping Methods     | Custom shipping in Hyva Checkout                | v1.1     |
| `hyva-checkout-fields`        | Custom Fields        | Custom checkout fields and validation           | v1.2     |
| `hyva-react-checkout`         | React Checkout       | Hyva React Checkout customization               | v1.2     |

#### 3.5.1 Skill Detail: `hyva-module-compatibility`

**Purpose:** Convert existing Luma-compatible modules to work with Hyva theme.

**Key Instructions:**

1. **Template Conversion**
   - Create Hyva-specific templates in `view/frontend/templates/`
   - Replace KnockoutJS bindings with Alpine.js
   - Remove RequireJS dependencies
   - Use Tailwind CSS instead of LESS

2. **JavaScript Conversion**
   - Replace `define(['jquery'], function($) {...})` with Alpine components
   - Use `x-data`, `x-on`, `x-show` instead of KO bindings
   - Implement `window.hyva.modal` for modals

3. **Layout XML Changes**
   - Create `hyva_` prefixed layout handles
   - Remove Luma JS blocks
   - Use `<update handle="hyva_default"/>` when needed

4. **CSS Conversion**
   - Replace LESS variables with Tailwind utilities
   - Use `@apply` for complex reusable styles
   - Ensure proper purge configuration

**Example Conversion:**

```html
<!-- Luma (KnockoutJS) -->
<div data-bind="visible: isVisible">
  <span data-bind="text: message"></span>
  <button data-bind="click: handleClick">Click</button>
</div>

<!-- Hyva (Alpine.js) -->
<div x-data="myComponent()" x-show="isVisible">
  <span x-text="message"></span>
  <button @click="handleClick">Click</button>
</div>

<script>
  function myComponent() {
    return {
      isVisible: true,
      message: 'Hello',
      handleClick() {
        this.message = 'Clicked!';
      },
    };
  }
</script>
```

**Compatibility Layer:**

- Use `Hyva_Theme::page/js/require-config.phtml` for fallbacks
- Implement `compat` module for essential jQuery plugins
- Test both Luma and Hyva with conditional logic

---

#### 3.5.2 Skill Detail: `hyva-checkout-customization`

**Purpose:** Customize Hyva Checkout using Magewire components.

**Key Instructions:**

1. **Understanding Magewire**
   - Server-side rendering with Livewire-like updates
   - Components extend `Magewirephp\Magewire\Component`
   - Templates use `wire:` directives

2. **Component Structure**

   ```
   app/code/Vendor/Module/
   ├── Magewire/
   │   └── Checkout/
   │       └── CustomStep.php
   └── view/frontend/templates/
       └── magewire/checkout/
           └── custom-step.phtml
   ```

3. **Layout Integration**
   - Register components in layout XML
   - Use `<referenceContainer>` to add to checkout steps

4. **State Management**
   - Public properties are reactive
   - Use `$emit()` for cross-component communication
   - Leverage `CheckoutSession` for data persistence

**Code Example:**

```php
// Magewire/Checkout/CustomStep.php
class CustomStep extends \Magewirephp\Magewire\Component
{
    public string $customField = '';

    public function rules(): array
    {
        return ['customField' => 'required|min:3'];
    }

    public function save(): void
    {
        $this->validate();
        // Save to quote
        $this->emit('customStepSaved');
    }
}
```

```html
<!-- templates/magewire/checkout/custom-step.phtml -->
<div>
  <input type="text" wire:model="customField" />
  <button wire:click="save">Save</button>
</div>
```

---

### 3.6 Testing (`testing`)

| Skill ID              | Name                | Description                          | Release  |
| --------------------- | ------------------- | ------------------------------------ | -------- |
| `testing-phpunit`     | PHPUnit Unit Tests  | Unit testing with PHPUnit            | **v1.0** |
| `testing-integration` | Integration Testing | Magento integration test framework   | v1.1     |
| `testing-mftf`        | MFTF E2E Tests      | Magento Functional Testing Framework | v1.1     |
| `testing-api`         | API Testing         | REST/GraphQL API testing             | v1.1     |
| `testing-playwright`  | Playwright E2E      | Modern E2E testing alternative       | v1.2     |
| `testing-js`          | JavaScript Testing  | Jasmine/Jest JS testing              | v1.2     |

#### 3.6.1 Skill Detail: `testing-phpunit`

**Purpose:** Write effective unit tests for Magento 2 modules.

**Key Instructions:**

1. **Test Location**
   - `app/code/Vendor/Module/Test/Unit/`
   - Mirror source directory structure

2. **Test Class Structure**

   ```php
   namespace Vendor\Module\Test\Unit\Model;

   use PHPUnit\Framework\TestCase;

   class MyServiceTest extends TestCase
   {
       private MyService $subject;
       private MockObject $dependencyMock;

       protected function setUp(): void
       {
           $this->dependencyMock = $this->createMock(Dependency::class);
           $this->subject = new MyService($this->dependencyMock);
       }
   }
   ```

3. **Mocking Guidelines**
   - Use PHPUnit's `createMock()` for interfaces
   - Use `getMockBuilder()` for complex mocking
   - Mock only direct dependencies

4. **Running Tests**
   ```bash
   vendor/bin/phpunit -c dev/tests/unit/phpunit.xml.dist app/code/Vendor/Module/Test/Unit
   ```

#### 3.6.2 About MFTF (Magento Functional Testing Framework)

**What is MFTF?**

MFTF is Adobe/Magento's official end-to-end (E2E) testing framework for testing complete user flows in Magento 2.

**Key Characteristics:**

| Aspect            | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| **Foundation**    | Built on PHP Codeception + Selenium WebDriver               |
| **Test Format**   | XML-based test definitions (not PHP code)                   |
| **Architecture**  | Page Object pattern with `<section>`, `<page>`, `<element>` |
| **Data**          | Entity-based test data via `<entity>` definitions           |
| **Extensibility** | Third-party modules can extend or merge existing tests      |

**MFTF Test Example:**

```xml
<!-- Test/Mftf/Test/StorefrontAddProductToCartTest.xml -->
<tests xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:noNamespaceSchemaLocation="urn:magento:mftf:Test/etc/testSchema.xsd">
    <test name="StorefrontAddSimpleProductToCartTest">
        <annotations>
            <title value="Add Simple Product to Cart"/>
            <severity value="CRITICAL"/>
        </annotations>

        <!-- Navigate to product page -->
        <amOnPage url="{{SimpleProduct.urlKey}}.html" stepKey="goToProductPage"/>

        <!-- Click add to cart -->
        <click selector="{{StorefrontProductActionSection.addToCart}}" stepKey="addToCart"/>

        <!-- Verify success message -->
        <waitForElementVisible selector="{{StorefrontMessagesSection.success}}" stepKey="waitForSuccess"/>
        <see selector="{{StorefrontMessagesSection.success}}" userInput="added to your shopping cart" stepKey="seeSuccessMessage"/>
    </test>
</tests>
```

**MFTF vs Modern Alternatives:**

| Framework      | Pros                                                   | Cons                                                |
| -------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **MFTF**       | Official support, deep Magento integration, extensible | Steep learning curve, slow execution, complex setup |
| **Playwright** | Modern, fast, multi-browser support                    | Requires manual selector maintenance, unofficial    |
| **Cypress**    | Great DX, easy debugging                               | No multi-tab support, unofficial                    |

**When to Use Each:**

- **MFTF**: Adobe Commerce Cloud projects, official certification, extension marketplace submissions
- **Playwright**: Hyva projects, teams preferring modern tooling, faster feedback loops

---

### 3.7 Performance (`performance`)

| Skill ID                  | Name                  | Description                                 | Release  |
| ------------------------- | --------------------- | ------------------------------------------- | -------- |
| `performance`             | Caching Strategies    | FPC, block cache, config cache optimization | **v1.0** |
| `performance-audit`       | Performance Audit     | Identify and diagnose performance issues    | v1.1     |
| `performance-indexer`     | Indexer Optimization  | Custom indexers and reindex strategies      | v1.1     |
| `performance-database`    | Database Optimization | Query optimization, indexing                | v1.1     |
| `performance-js-bundling` | JS Optimization       | Critical JS, defer, bundle configuration    | v1.1     |
| `performance-images`      | Image Optimization    | Lazy loading, WebP, responsive images       | v1.2     |
| `performance-varnish`     | Varnish Configuration | Varnish VCL customization                   | v1.2     |
| `performance-profiling`   | Profiling Tools       | Blackfire, New Relic, built-in profiler     | v1.2     |

#### 3.7.1 Skill Detail: `performance-audit`

**Purpose:** Systematically identify performance bottlenecks in Magento 2.

**Key Instructions:**

1. **Frontend Audit**
   - Check TTFB (Time to First Byte)
   - Analyze render-blocking resources
   - Review JS/CSS bundle sizes
   - Check image optimization status

2. **Backend Audit**
   - Enable query logging
   - Check for N+1 query patterns
   - Review plugin stack on critical paths
   - Analyze cache hit rates

3. **Database Audit**
   - Run `EXPLAIN` on slow queries
   - Check index usage
   - Review flat table status
   - Analyze table sizes

4. **Cache Audit**
   - Verify FPC status
   - Check cache invalidation frequency
   - Review cacheable blocks

**Checklist Template:**

```markdown
## Performance Audit Checklist

### Frontend

- [ ] TTFB < 200ms
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] JS bundle < 500KB (gzipped)

### Backend

- [ ] No N+1 queries
- [ ] FPC hit rate > 95%
- [ ] Plugin count on checkout < 50

### Database

- [ ] All slow queries have indexes
- [ ] No full table scans
- [ ] Flat catalog appropriate for size
```

---

#### 3.7.2 Skill Detail: `performance`

**Purpose:** Implement effective caching strategies.

**Key Instructions:**

1. **Full Page Cache (FPC)**
   - Ensure pages are cacheable
   - Use `cacheable="false"` sparingly
   - Implement cache hole-punching with ESI

2. **Block Cache**
   - Implement `getIdentities()` for cache tags
   - Use `getCacheLifetime()` appropriately
   - Cache key strategies

3. **Application-Level Cache**

   ```php
   // Using CacheInterface for custom data caching
   $cacheKey = 'custom_data_' . $storeId;
   if ($data = $this->cache->load($cacheKey)) {
       return $this->serializer->unserialize($data);
   }
   $data = $this->computeExpensiveData();
   $this->cache->save(
       $this->serializer->serialize($data),
       $cacheKey,
       ['custom_cache_tag'],
       3600 // lifetime in seconds
   );
   ```

4. **Custom Cache Types**
   - When to create custom cache types
   - Cache type declaration in `cache.xml`

**Anti-patterns:**

- Caching user-specific data in FPC
- Not implementing cache invalidation
- Over-caching leading to stale data

---

### 3.8 Upgrade & Migration (`upgrade`)

| Skill ID                   | Name                   | Description                              | Release |
| -------------------------- | ---------------------- | ---------------------------------------- | ------- |
| `upgrade-planning`         | Upgrade Planning       | Pre-upgrade assessment and planning      | v1.1    |
| `upgrade-compatibility`    | Compatibility Fixes    | Fix deprecated code and breaking changes | v1.1    |
| `upgrade-2.4.6-to-2.4.7`   | 2.4.6 → 2.4.7          | Specific version upgrade guide           | v1.1    |
| `upgrade-2.4.x-minor`      | Minor Version Upgrades | Generic 2.4.x minor upgrade process      | v1.1    |
| `upgrade-php-8.2`          | PHP 8.2 Compatibility  | PHP version upgrade fixes                | v1.1    |
| `upgrade-elasticsearch`    | Search Migration       | MySQL → Elasticsearch/OpenSearch         | v1.2    |
| `upgrade-composer-patches` | Patch Management       | Composer patches workflow                | v1.2    |

#### 3.8.1 Skill Detail: `upgrade-planning`

**Purpose:** Create a comprehensive upgrade plan.

**Key Instructions:**

1. **Pre-Upgrade Assessment**
   - Current version identification
   - Extension compatibility check
   - Custom code audit
   - Database size and health

2. **Upgrade Path Determination**
   - Direct upgrade vs. stepping stones
   - Adobe Commerce vs. Open Source considerations
   - PHP version requirements

3. **Risk Assessment**
   - Custom module complexity
   - Third-party extension count
   - Custom theme complexity
   - Integration points

4. **Timeline Estimation**
   - Based on risk factors
   - Testing requirements
   - Rollback planning

**Template:**

```markdown
## Upgrade Plan: {current} → {target}

### Current State

- Magento Version:
- PHP Version:
- Extensions:
- Custom Modules:

### Upgrade Path

1. Step 1: ...
2. Step 2: ...

### Risk Areas

- High: ...
- Medium: ...
- Low: ...

### Timeline

- Development: X weeks
- Testing: X weeks
- Deployment: X days

### Rollback Plan

- ...
```

---

#### 3.8.2 Skill Detail: `upgrade-compatibility`

**Purpose:** Fix deprecated and breaking code changes.

**Key Instructions:**

1. **Detection**

   ```bash
   vendor/bin/phpstan analyse --level=5 app/code/
   vendor/bin/phpcs --standard=Magento2 app/code/
   ```

2. **Common Deprecations**
   - `ObjectManager` direct usage → DI
   - Legacy serialization → JSON
   - `$this->_eventManager` → constructor injection
   - Raw SQL → declarative schema

3. **PHP Compatibility**
   - Typed properties
   - Union types
   - Named arguments in overrides

4. **Fix Patterns**
   - Search for deprecated patterns
   - Apply systematic fixes
   - Test each change

---

### 3.9 DevOps (`devops`)

| Skill ID            | Name                 | Description                   | Release |
| ------------------- | -------------------- | ----------------------------- | ------- |
| `devops-docker`     | Docker Development   | Local development with Docker | v1.1    |
| `devops-cicd`       | CI/CD Pipeline       | GitHub Actions / GitLab CI    | v1.1    |
| `devops-deployment` | Deployment Strategy  | Zero-downtime deployment      | v1.2    |
| `devops-cloud`      | Adobe Commerce Cloud | Cloud-specific configuration  | v1.2    |
| `devops-monitoring` | Monitoring & Alerts  | Application monitoring setup  | v1.2    |

---

### 3.10 Standards (`standards`)

| Skill ID            | Name                  | Description                          | Release  |
| ------------------- | --------------------- | ------------------------------------ | -------- |
| `standards-coding`  | Coding Standards      | Magento 2 coding standards reference | **v1.0** |
| `standards-phpcs`   | PHPCS Configuration   | PHP CodeSniffer setup                | v1.1     |
| `standards-phpstan` | PHPStan Configuration | Static analysis setup                | v1.1     |
| `standards-git`     | Git Workflow          | Branching, commits, PR conventions   | v1.1     |

---

## 4. YAML Schema Specification

### 4.1 Skill Schema

Full schema lives in `schema/skill.schema.json`. Excerpt below for reference.

```yaml
# JSON Schema representation of skill.yaml structure
$schema: 'http://json-schema.org/draft-07/schema#'
type: object
required:
  - id
  - name
  - version
  - category
  - description
  - instructions
properties:
  id:
    type: string
    pattern: '^[a-z][a-z0-9-]*$'
    description: Unique skill identifier (kebab-case)

  name:
    type: string
    maxLength: 60
    description: Human-readable skill name

  version:
    type: string
    pattern: "^\\d+\\.\\d+\\.\\d+$"
    description: SemVer version string

  category:
    type: string
    enum:
      - module
      - api
      - admin
      - frontend
      - hyva
      - testing
      - performance
      - upgrade
      - devops
      - standards

  description:
    type: string
    maxLength: 200
    description: Brief skill description

  tags:
    type: array
    items:
      type: string
    description: Searchable tags

  magento_versions:
    type: array
    items:
      type: string
    description: Compatible Magento versions (e.g., "2.4.6", "2.4.x")

  dependencies:
    type: array
    items:
      type: string
    description: Other skill IDs this skill depends on

  instructions:
    type: string
    description: Main skill content in Markdown format

  conventions:
    type: array
    items:
      type: object
      properties:
        rule:
          type: string
        example:
          type: string
        rationale:
          type: string
      required: [rule]

  examples:
    type: array
    items:
      type: object
      properties:
        title:
          type: string
        description:
          type: string
        code:
          type: string
        language:
          type: string
      required: [title, code]

  anti_patterns:
    type: array
    items:
      type: object
      properties:
        pattern:
          type: string
        problem:
          type: string
        solution:
          type: string
      required: [pattern, problem]

  files:
    type: array
    items:
      type: object
      properties:
        path:
          type: string
        template:
          type: string
        description:
          type: string
      required: [path]

  references:
    type: array
    items:
      type: object
      properties:
        title:
          type: string
        url:
          type: string
      required: [title, url]

  compatibility:
    type: array
    items:
      type: string
      enum:
        - claude
        - opencode
        - cursor
        - codex
        - qoder
        - trae
    description: List of compatible AI tools supported by the current formatter set. Adding a new tool requires schema and formatter updates.
```

### 4.2 Example Skill YAML

```yaml
id: module-plugin
name: Plugin Development
version: '1.0.0'
category: module
description: Implement Magento 2 plugins (interceptors) following best practices

tags:
  - plugin
  - interceptor
  - di
  - around
  - before
  - after

magento_versions:
  - '2.4.x'

dependencies: []

instructions: |
  ### Magento 2 Plugin Development Guide

  Plugins (interceptors) allow you to modify the behavior of public methods
  without changing the original class. This is a core Magento 2 extension mechanism.

  ### When to Use Plugins

  Use plugins when you need to:
  - Modify input parameters before method execution (before plugin)
  - Modify return values after method execution (after plugin)
  - Completely wrap method execution (around plugin)

  ### Plugin Types

  1. **Before Plugin** - Modifies input parameters
  2. **After Plugin** - Modifies return value
  3. **Around Plugin** - Wraps entire method (use sparingly)

  ### Implementation Steps

  1. Create plugin class in `Plugin/` directory
  2. Declare plugin in `etc/di.xml`
  3. Implement appropriate plugin method(s)

conventions:
  - rule: 'Plugin class naming: {TargetClassShortName}{PluginPurpose}Plugin'
    example: 'ProductPriceModifierPlugin'
    rationale: 'Clear identification of what the plugin targets and does'

  - rule: 'Prefer before/after plugins over around plugins'
    example: 'Use afterGetPrice() instead of aroundGetPrice() when only modifying return value'
    rationale: 'Around plugins break the plugin chain if not implemented correctly'

  - rule: 'Always include type hints for all parameters'
    example: 'public function beforeSetName(Product $subject, string $name): array'
    rationale: 'Type safety and IDE autocompletion'

examples:
  - title: 'Before Plugin'
    description: 'Modify product name before saving'
    language: php
    code: |
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

  - title: 'After Plugin'
    description: 'Append suffix to product name'
    language: php
    code: |
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

  - title: 'di.xml Configuration'
    description: 'Plugin declaration'
    language: xml
    code: |
      <?xml version="1.0"?>
      <config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
          <type name="Magento\Catalog\Model\Product">
              <plugin name="vendor_module_product_name_normalizer"
                      type="Vendor\Module\Plugin\ProductNameNormalizerPlugin"
                      sortOrder="10"/>
          </type>
      </config>

anti_patterns:
  - pattern: 'Using around plugin when before/after would suffice'
    problem: 'Around plugins are harder to debug and can break plugin chain'
    solution: 'Only use around when you need to conditionally skip method execution'

  - pattern: 'Plugin on __construct method'
    problem: 'Constructor plugins are not supported'
    solution: 'Use preference or composition instead'

  - pattern: 'Plugin on private/protected methods'
    problem: 'Only public methods can be intercepted'
    solution: 'Consider preference if you must modify non-public methods'

files:
  - path: 'Plugin/{ClassName}Plugin.php'
    description: 'Plugin class file'
    template: |
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

  - path: 'etc/di.xml'
    description: 'Plugin declaration'
    template: |
      <?xml version="1.0"?>
      <config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
          <type name="{{targetClass}}">
              <plugin name="{{pluginName}}"
                      type="{{vendor}}\{{module}}\Plugin\{{className}}Plugin"
                      sortOrder="10"/>
          </type>
      </config>

references:
  - title: 'Magento DevDocs: Plugins'
    url: 'https://developer.adobe.com/commerce/php/development/components/plugins/'
  - title: 'Plugin Best Practices'
    url: 'https://developer.adobe.com/commerce/php/best-practices/extensions/plugins/'

compatibility:
  - claude
  - opencode
  - cursor
  - codex
  - qoder
  - trae
```

### 4.3 Configuration Schema

Full schema lives in `schema/config.schema.json`. Excerpt below for reference.

```yaml
# .magehub.yaml - Project configuration
$schema: 'http://json-schema.org/draft-07/schema#'
type: object
required:
  - version
  - skills
properties:
  version:
    type: string
    description: Config schema version (required for future migrations)

  skills:
    type: array
    items:
      type: string
    description: List of skill IDs to use

  format:
    type: string
    enum:
      - claude
      - opencode
      - cursor
      - codex
      - qoder
      - trae
    default: claude
    description: Default output format

  output:
    type: string
    description: Output file path

  include_examples:
    type: boolean
    default: true
    description: Include code examples in output

  include_antipatterns:
    type: boolean
    default: true
    description: Include anti-patterns in output

  custom_skills_path:
    type: string
    description: Path to custom skills directory

  # --- v1.1+ fields (ignored in v1.0) ---

  registries:
    type: array
    description: 'Remote skill registries (v1.1+)'
    items:
      type: object
      properties:
        name:
          type: string
        url:
          type: string
        public_key:
          type: string
      required: [name, url]

  allowlist:
    type: array
    description: 'Allowed remote skill patterns (v1.1+)'
    items:
      type: string
```

---

## 5. CLI Design

### 5.1 Command Style

Following Magento's CLI convention:

```
magehub <namespace>:<command> [arguments] [options]
```

With shorthand support when unambiguous:

```
magehub s:l    # skill:list
magehub s:i    # skill:install
```

### 5.2 Command Reference

#### 5.2.1 `setup:init`

Initialize MageHub in a project.

```bash
magehub setup:init [--format=<format>]
```

**Aliases:** `init`, `se:i`

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format` | Default output format | `claude` |

**Behavior:**

1. Create `.magehub.yaml` configuration file
2. Prompt for default format if not specified
3. Add `.magehub/` to `.gitignore` (optional)

**Example:**

```bash
$ magehub setup:init --format=cursor

Created .magehub.yaml
MageHub initialized successfully!

Next steps:
  1. Run 'magehub skill:list' to see available skills
  2. Run 'magehub skill:install <skill>' to add skills
  3. Run 'magehub generate' to create context file
```

---

#### 5.2.2 `skill:list`

List available skills.

```bash
magehub skill:list [--category=<category>] [--format=<format>]
```

**Aliases:** `list`, `s:l`

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--category` | Filter by category | (all) |
| `--format` | Output format: `table`, `json` | `table` |

**Example:**

```bash
$ magehub skill:list --category=module

Module Development Skills
═══════════════════════════════════════════════════════════════

  ID                          Version   Description
  ────────────────────────────────────────────────────────────
  module-scaffold             1.0.0     Create standard Magento 2 module structure
  module-plugin               1.0.0     Before/After/Around plugin implementation
  module-di                   1.0.0     DI configuration, preferences, virtualTypes
  module-setup                1.0.0     Declarative schema and data patches

Total: 4 skills
```

---

#### 5.2.3 `skill:search`

Search skills by keyword.

```bash
magehub skill:search <keyword> [--category=<category>]
```

**Aliases:** `search`, `s:se`

**Example:**

```bash
$ magehub skill:search graphql

Search results for "graphql":

  api-graphql-resolver      GraphQL resolver implementation

Found 1 skill matching "graphql"
```

---

#### 5.2.4 `skill:show`

Display detailed skill information.

```bash
magehub skill:show <skill-id>
```

**Aliases:** `show`, `s:sh`

**Example:**

```bash
$ magehub skill:show module-plugin

╔══════════════════════════════════════════════════════════════╗
║  module-plugin v1.0.0                                        ║
║  Plugin Development                                          ║
╠══════════════════════════════════════════════════════════════╣
║  Category:     module                                        ║
║  Magento:      2.4.x                                         ║
║  Tags:         plugin, interceptor, di, around, before       ║
╚══════════════════════════════════════════════════════════════╝

Description:
  Implement Magento 2 plugins (interceptors) following best practices

Conventions:
  • Plugin class naming: {TargetClassShortName}{PluginPurpose}Plugin
  • Prefer before/after plugins over around plugins
  • Always include type hints for all parameters

Examples: 3 included
Anti-patterns: 3 documented
File templates: 2 available

References:
  • Magento DevDocs: Plugins
    https://developer.adobe.com/commerce/php/development/components/plugins/
```

---

#### 5.2.5 `skill:install`

Install skills to the project.

```bash
magehub skill:install <skill-id...> [--category=<category>]
```

**Aliases:** `install`, `s:i`

**Options:**
| Option | Description |
|--------|-------------|
| `--category` | Install all skills in category |

**Example:**

```bash
$ magehub skill:install module-plugin performance

Installing skills...
  ✓ module-plugin (v1.0.0)
  ✓ performance (v1.0.0)

Updated .magehub.yaml:
  skills:
    - module-plugin
    - performance

Run 'magehub generate' to create context file.
```

Remote skills require an allowed registry or repository configured in `.magehub.yaml`.

```bash
$ magehub skill:install --category=module

Installing all skills in category 'module'...
  ✓ module-scaffold (v1.0.0)
  ✓ module-plugin (v1.0.0)
  ✓ module-di (v1.0.0)
  ✓ module-setup (v1.0.0)

Installed 4 skills.
```

---

#### 5.2.6 `skill:remove`

Remove skills from the project.

```bash
magehub skill:remove <skill-id...>
```

**Aliases:** `remove`, `s:r`

**Example:**

```bash
$ magehub skill:remove performance

Removed skills:
  ✓ performance

Updated .magehub.yaml
```

---

#### 5.2.7 `generate`

Generate context file for AI tool.

```bash
magehub generate [--format=<format>] [--output=<path>] [--skills=<ids>]
```

**Aliases:** `gen`, `g`

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--format` | Output format | from config |
| `--output` | Output file path | auto |
| `--skills` | Comma-separated skill IDs | from config |
| `--no-examples` | Exclude code examples | false |
| `--no-antipatterns` | Exclude anti-patterns | false |

**Format-specific defaults:**
| Format | Default Output |
|--------|----------------|
| `claude` | `CLAUDE.md` |
| `opencode` | `.opencode/skills/magehub.md` |
| `cursor` | `.cursorrules` |
| `codex` | `AGENTS.md` |
| `qoder` | `.qoder/context.md` |
| `trae` | `.trae/rules/magehub.md` |

**Example:**

```bash
$ magehub generate

Generating context file...

Skills included:
  • module-plugin
  • performance
  • standards-coding

Output: CLAUDE.md (12.4 KB)

Context file generated successfully!
```

```bash
$ magehub generate --format=cursor --output=.cursor/rules/magento.mdc

Generated: .cursor/rules/magento.mdc
```

---

#### 5.2.8 `skill:update` (v1.1)

> **Note:** This command requires remote skill support and will be available in **v1.1**.

Update remote skill cache to latest version.

```bash
magehub skill:update [--force]
```

**Aliases:** `update`, `s:u`

**Options:**
| Option | Description |
|--------|-------------|
| `--force` | Force re-download even if up-to-date |

**Example:**

```bash
$ magehub skill:update

Checking for updates...

Updated skills:
  • community/customer-rewards: 0.9.2 → 0.9.3
  • acme/private/payment-gateway: 1.2.0 → 1.2.1

Remote skill cache updated
```

Core skills bundled with the CLI update only when MageHub itself is upgraded.

---

#### 5.2.9 `config:show`

Display current configuration.

```bash
magehub config:show
```

**Aliases:** `config`, `c:s`

---

#### 5.2.10 `config:validate`

Validate `.magehub.yaml` against the configuration schema.

```bash
magehub config:validate
```

**Aliases:** `validate`, `c:v`

**Behavior:**

1. Validate config file shape and values
2. Report unknown keys and invalid formats
3. Exit non-zero on validation errors

**Example:**

```bash
$ magehub config:validate

.magehub.yaml is valid
```

---

#### 5.2.11 `skill:verify`

Verify skill YAML files against schema.

```bash
magehub skill:verify [--all] [--skill=<id>]
```

**Aliases:** `verify`, `s:v`

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--all` | Verify all installed skills | false |
| `--skill` | Verify a specific skill ID | (none) |

**Behavior (v1.0):**

1. Validate skill YAML against schema
2. Warn if `instructions` contains `#` or `##` headings (merge conflict risk)
3. Report all validation errors

**Additional behavior (v1.1+):** 4. Confirm checksum matches local manifest (remote skills) 5. If registry provides signatures, verify them

**Example:**

```bash
$ magehub skill:verify --all

Verifying skills...
  ✓ module-plugin (schema OK)
  ✓ module-di (schema OK)
  ⚠ custom-skill (schema OK, heading level warning: uses ## in instructions)

All skills verified (1 warning)
```

---

### 5.3 Interactive Mode (Planned for v1.1)

> **Note:** Interactive mode is **not included in v1.0**. The design below is included for reference.

For first-time users, provide guided setup:

```bash
$ magehub

Welcome to MageHub!

What would you like to do?
  1. Initialize MageHub in this project
  2. Browse available skills
  3. Search for a skill
  4. Show help

> 1

Select your primary AI tool:
  1. Claude Code
  2. OpenCode
  3. Cursor
  4. Codex
  5. Qoder
  6. Trae

> 3

Select skill categories (space to toggle, enter to confirm):
  [x] Module Development
  [x] Hyva Ecosystem
  [ ] API Development
  [ ] Testing
  [ ] Performance
  [ ] Upgrade

Generating .cursorrules...
Done!

Run 'cursor .' to start coding with MageHub skills.
```

### 5.4 Shorthand Resolution

Shorthands use **longest unique prefix matching**. If a shorthand is ambiguous, the CLI prints all matching commands and exits with code 1.

| Full Command      | Shorthand | Notes                                             |
| ----------------- | --------- | ------------------------------------------------- |
| `skill:list`      | `s:l`     |                                                   |
| `skill:install`   | `s:i`     |                                                   |
| `skill:show`      | `s:sh`    | Not `s:s` (conflicts with search)                 |
| `skill:search`    | `s:se`    |                                                   |
| `skill:remove`    | `s:r`     |                                                   |
| `skill:verify`    | `s:v`     |                                                   |
| `setup:init`      | `se:i`    | `se` prefix avoids collision with `skill:*` (`s`) |
| `config:show`     | `c:s`     |                                                   |
| `config:validate` | `c:v`     |                                                   |
| `generate`        | `g`       | Top-level, no namespace                           |
| `skill:update`    | `s:u`     | **v1.1 only** (remote skills)                     |

### 5.5 Error Handling & Exit Codes

All commands follow a consistent error handling strategy:

| Exit Code | Meaning       | Example                                                       |
| --------- | ------------- | ------------------------------------------------------------- |
| `0`       | Success       | Command completed normally                                    |
| `1`       | General error | Unknown command, ambiguous shorthand                          |
| `2`       | Config error  | Missing or invalid `.magehub.yaml`                            |
| `3`       | Skill error   | Skill not found, YAML parse failure, schema validation failed |
| `4`       | I/O error     | Cannot write output file, permission denied                   |

**Error behavior:**

- **YAML parse failure:** Print file path, line number, and parse error message. Exit 3.
- **Schema validation failure:** Print all validation errors (not just the first). Exit 3.
- **Missing config file:** Print a suggestion to run `magehub setup:init`. Exit 2.
- **Unknown skill ID:** Print the invalid ID and suggest `skill:search`. Exit 3.
- **Output write failure:** Print the target path and OS error. Exit 4.
- **Ambiguous shorthand:** List all matching commands. Exit 1.

All error messages are written to `stderr`. Normal output goes to `stdout`.

---

## 6. Tool Compatibility

### 6.1 Output Format Specifications

#### 6.1.1 Claude Code (`claude`)

**Output Location:** `CLAUDE.md` (project root)

**Format:**

```markdown
# MageHub Context

> Auto-generated by MageHub v{version}
> Skills: {skill-list}
> Generated: {timestamp}

---

## {Skill Name}

{instructions}

### Conventions

{conventions}

### Examples

{examples}

### Anti-patterns

{anti_patterns}

---

## {Next Skill Name}

...
```

---

#### 6.1.2 OpenCode (`opencode`)

**Output Location:** `.opencode/skills/magehub.md`

**Format:** Same as Claude Code (Markdown)

**Additional:** May create multiple files per skill if needed.

---

#### 6.1.3 Cursor (`cursor`)

**Output Location:** `.cursorrules` or `.cursor/rules/*.mdc`

**Format:**

```markdown
---
description: MageHub - Magento 2 AI Coding Skills
globs:
  - '**/*.php'
  - '**/*.xml'
  - '**/*.phtml'
  - '**/*.graphqls'
alwaysApply: true
---

# Magento 2 Development Guidelines

{combined instructions from all skills}

## Module Development

{module skills content}

## Hyva Development

{hyva skills content}

...
```

---

#### 6.1.4 Codex (`codex`)

**Output Location:** `AGENTS.md` (project root)

**Format:**

```markdown
# MageHub — Magento 2 Agent Instructions

> Auto-generated by MageHub v{version}
> Skills: {skill-list}
> Generated: {timestamp}

## Instructions

You are working on a Magento 2 project. Follow these guidelines:

{combined instructions from all skills, each as a ### section}

## Conventions

{conventions merged from all skills as a bullet list}

## Anti-patterns to Avoid

{anti-patterns merged from all skills as a bullet list}
```

> **Note:** Codex CLI reads `AGENTS.md` for agent-level instructions. The format is flat Markdown with imperative tone, avoiding nested file structures.

---

#### 6.1.5 Qoder (`qoder`)

**Output Location:** `.qoder/context.md`

**Format:**

```markdown
---
name: MageHub
type: context
version: { version }
skills: [{ skill-list }]
generated: { timestamp }
---

# Magento 2 Development Context

{combined instructions from all skills, each as a ## section}

## Coding Conventions

{conventions merged from all skills}
```

> **Note:** Qoder uses YAML front-matter for metadata. The body follows standard Markdown. Qoder reads files from `.qoder/` automatically.

---

#### 6.1.6 Trae (`trae`)

**Output Location:** `.trae/rules/magehub.md`

**Format:**

```markdown
---
description: MageHub — Magento 2 AI Coding Skills
version: { version }
skills: [{ skill-list }]
---

# Magento 2 Rules

{combined instructions from all skills, each as a ## section}

## Do

{conventions rewritten as positive "Do X" rules}

## Do Not

{anti-patterns rewritten as "Do not X" rules}
```

> **Note:** Trae loads rule files from `.trae/rules/`. Each file is a self-contained rule set with YAML front-matter. Trae prefers concise, imperative "Do / Do Not" formatting.

---

### 6.2 File Pattern Detection

The CLI can auto-detect the appropriate format. Auto-detection is a **fallback only**; users should prefer the explicit `--format` flag when multiple tools are used in the same project.

**Priority order** (first match wins):

```typescript
function detectFormat(projectPath: string): Format {
  // Cursor-specific directories/files (highest priority — most specific indicator)
  if (existsSync(join(projectPath, '.cursor'))) return 'cursor';
  if (existsSync(join(projectPath, '.cursorrules'))) return 'cursor';

  // Tool-specific config directories
  if (existsSync(join(projectPath, '.opencode'))) return 'opencode';
  if (existsSync(join(projectPath, '.qoder'))) return 'qoder';
  if (existsSync(join(projectPath, '.trae'))) return 'trae';

  // File-based detection (less specific)
  if (existsSync(join(projectPath, 'AGENTS.md'))) return 'codex';
  if (existsSync(join(projectPath, 'CLAUDE.md'))) return 'claude';

  return 'claude'; // default fallback
}
```

> **Note:** Claude Code uses `CLAUDE.md` at the project root (not a `.claude` directory). The detection checks for the file itself. When multiple tools coexist, explicit `--format` is recommended.

---

## 7. Project Structure

```
magehub/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI pipeline
│   │   ├── release.yml               # npm publish
│   │   └── skill-validation.yml      # Validate skill YAML
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/
│   ├── getting-started.md
│   ├── cli-reference.md
│   ├── creating-skills.md
│   ├── contributing-skills.md
│   └── format-specifications.md
│
├── schema/
│   ├── skill.schema.json             # Skill YAML validation
│   └── config.schema.json            # .magehub.yaml validation
│
├── skills/                            # Skill library (v1.0: 10 bundled skills)
│   ├── module/
│   │   ├── module-scaffold/
│   │   │   └── skill.yaml
│   │   ├── module-plugin/
│   │   │   └── skill.yaml
│   │   ├── module-di/
│   │   │   └── skill.yaml
│   │   └── module-setup/
│   │       └── skill.yaml
│   ├── api/
│   │   └── api-graphql-resolver/
│   │       └── skill.yaml
│   ├── admin/
│   │   └── admin-ui-grid/
│   │       └── skill.yaml
│   ├── hyva/
│   │   └── hyva-module-compatibility/
│   │       └── skill.yaml
│   ├── testing/
│   │   └── testing-phpunit/
│   │       └── skill.yaml
│   ├── performance/
│   │   └── performance/
│   │       └── skill.yaml
│   └── standards/
│       └── standards-coding/
│           └── skill.yaml
│
├── templates/                         # Output format templates
│   ├── claude.hbs
│   ├── opencode.hbs
│   ├── cursor.hbs
│   ├── codex.hbs
│   ├── qoder.hbs
│   └── trae.hbs
│
├── src/                               # CLI source code
│   ├── index.ts                       # Entry point
│   ├── cli.ts                         # CLI setup with commander
│   │
│   ├── commands/                      # Command implementations
│   │   ├── setup/
│   │   │   └── init.ts
│   │   ├── skill/
│   │   │   ├── list.ts
│   │   │   ├── search.ts
│   │   │   ├── show.ts
│   │   │   ├── install.ts
│   │   │   ├── remove.ts
│   │   │   └── update.ts
│   │   ├── config/
│   │   │   └── show.ts
│   │   └── generate.ts
│   │
│   ├── core/                          # Core functionality
│   │   ├── skill-loader.ts            # Load and parse skill YAML
│   │   ├── skill-registry.ts          # Skill index and lookup
│   │   ├── skill-validator.ts         # YAML schema validation
│   │   └── config-manager.ts          # .magehub.yaml handling
│   │   # cache-manager.ts             # Remote skill caching (v1.1)
│   │
│   ├── formatters/                    # Output formatters
│   │   ├── base-formatter.ts
│   │   ├── claude-formatter.ts
│   │   ├── opencode-formatter.ts
│   │   ├── cursor-formatter.ts
│   │   ├── codex-formatter.ts
│   │   ├── qoder-formatter.ts
│   │   └── trae-formatter.ts
│   │
│   ├── utils/
│   │   ├── logger.ts                  # Colored console output
│   │   ├── fs.ts                      # File system helpers
│   │   ├── template.ts                # Handlebars wrapper
│   │   └── shorthand.ts               # Command shorthand resolution
│   │
│   └── types/
│       ├── skill.ts                   # Skill type definitions
│       ├── config.ts                  # Config type definitions
│       └── index.ts
│
├── tests/
│   ├── commands/
│   │   ├── skill-list.test.ts
│   │   ├── skill-install.test.ts
│   │   └── generate.test.ts
│   ├── core/
│   │   ├── skill-loader.test.ts
│   │   └── skill-validator.test.ts
│   ├── formatters/
│   │   └── claude-formatter.test.ts
│   └── fixtures/
│       └── skills/
│
├── .editorconfig
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── README.md
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## 8. Technical Stack

### 8.1 Runtime & Language

| Component | Choice         | Rationale                     |
| --------- | -------------- | ----------------------------- |
| Runtime   | Node.js 18+    | Wide adoption, npm ecosystem  |
| Language  | TypeScript 5.x | Type safety, better DX        |
| Module    | ESM            | Modern standard, tree-shaking |

### 8.2 Dependencies

#### Production Dependencies

| Package      | Version | Purpose                |
| ------------ | ------- | ---------------------- |
| `commander`  | ^12.x   | CLI framework          |
| `yaml`       | ^2.x    | YAML parsing           |
| `ajv`        | ^8.x    | JSON Schema validation |
| `handlebars` | ^4.x    | Template rendering     |
| `chalk`      | ^5.x    | Terminal colors        |
| `inquirer`   | ^9.x    | Interactive prompts    |
| `ora`        | ^8.x    | Spinners               |
| `cli-table3` | ^0.6.x  | Table output           |

#### Development Dependencies

| Package       | Version | Purpose             |
| ------------- | ------- | ------------------- |
| `typescript`  | ^5.x    | TypeScript compiler |
| `tsup`        | ^8.x    | Build/bundle        |
| `vitest`      | ^1.x    | Testing             |
| `eslint`      | ^9.x    | Linting             |
| `prettier`    | ^3.x    | Formatting          |
| `@types/node` | ^20.x   | Node.js types       |

### 8.3 Build Configuration

**tsup.config.ts:**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  minify: true,
  target: 'node18',
  shims: true,
});
```

**package.json (key fields):**

```json
{
  "name": "magehub",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "magehub": "./dist/index.js"
  },
  "files": ["dist", "skills", "templates", "schema"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "engines": {
    "node": ">=18"
  }
}
```

---

## 9. Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal:** Project setup and core infrastructure

#### 1.1 Repository Setup

- [ ] Initialize npm package
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up vitest for testing
- [ ] Create GitHub repository
- [ ] Configure CI/CD workflows

#### 1.2 Schema & Validation

- [ ] Define `skill.schema.json`
- [ ] Define `config.schema.json`
- [ ] Implement schema validation with Ajv
- [ ] Create skill validation tests
- [ ] Implement `config:validate` command
- [ ] Implement `skill:verify` command

#### 1.3 Core Module

- [ ] Implement `skill-loader.ts`
- [ ] Implement `skill-registry.ts`
- [ ] Implement `config-manager.ts`
- [ ] Create core module tests

**Deliverables:**

- Working project structure
- Schema definitions
- Skill loading and validation

---

### Phase 2: CLI Framework (Week 2)

**Goal:** Basic CLI commands working

#### 2.1 CLI Setup

- [ ] Configure Commander.js
- [ ] Implement shorthand resolution
- [ ] Set up help system
- [ ] Implement logging utilities

#### 2.2 Basic Commands

- [ ] `setup:init` - Initialize project
- [ ] `skill:list` - List available skills
- [ ] `skill:search` - Search skills by keyword
- [ ] `skill:show` - Show skill details
- [ ] `config:show` - Show configuration
- [ ] `config:validate` - Validate config file

#### 2.3 Installation Commands

- [ ] `skill:install` - Add skills to project
- [ ] `skill:remove` - Remove skills
- [ ] Config file management

**Deliverables:**

- Working CLI with basic commands
- Project initialization
- Skill installation/removal

---

### Phase 3: Formatters & Generation (Week 3)

**Goal:** Generate output files for all supported tools

#### 3.1 Template System

- [ ] Set up Handlebars templates
- [ ] Create base formatter class
- [ ] Implement template helpers

#### 3.2 Output Formatters

- [ ] Claude Code formatter
- [ ] OpenCode formatter
- [ ] Cursor formatter
- [ ] Codex formatter
- [ ] Qoder formatter
- [ ] Trae formatter

#### 3.3 Generate Command

- [ ] Implement `generate` command
- [ ] Skill merging logic
- [ ] Format auto-detection
- [ ] Verify installed skills before generation (warning on invalid)

**Deliverables:**

- Working `generate` command
- All formatter implementations
- Template files

---

### Phase 4: MVP Skills (Week 3-4)

**Goal:** Create 10 core skills (see Section 3.0 for selection rationale)

#### 4.1 Module Skills (4)

- [ ] `module-scaffold` — Module scaffolding foundations
- [ ] `module-plugin` — Plugin (interceptor) development
- [ ] `module-di` — Dependency injection configuration
- [ ] `module-setup` — Declarative schema and data patches

#### 4.2 API & Admin Skills (2)

- [ ] `api-graphql-resolver` — GraphQL resolver implementation
- [ ] `admin-ui-grid` — Admin grid UI components

#### 4.3 Hyva Skills (1)

- [ ] `hyva-module-compatibility` — Luma-to-Hyva module conversion

#### 4.4 Quality & Standards Skills (3)

- [ ] `testing-phpunit` — PHPUnit testing for Magento
- [ ] `performance` — Caching strategies (FPC, block, custom)
- [ ] `standards-coding` — Magento 2 coding standards

**Deliverables:**

- 10 production-ready skills
- Validated against schema

---

### Phase 5: Polish & Release (Week 5)

**Goal:** Production-ready release

#### 5.1 Documentation

- [ ] README.md with examples
- [ ] CLI reference docs
- [ ] Skill creation guide
- [ ] Contributing guide

#### 5.2 Testing & QA

- [ ] Integration tests
- [ ] Manual testing on real Magento projects
- [ ] Cross-platform testing (macOS, Linux, Windows)

#### 5.3 Release

- [ ] Version 1.0.0
- [ ] npm publish
- [ ] GitHub release
- [ ] Announcement

**Deliverables:**

- Published npm package
- Complete documentation
- GitHub release

---

### Milestone Summary

| Week | Phase         | Key Deliverable                         |
| ---- | ------------- | --------------------------------------- |
| 1    | Foundation    | Project structure, schemas, core module |
| 2    | CLI Framework | Working CLI commands                    |
| 3    | Formatters    | Output generation for all tools         |
| 3-4  | MVP Skills    | 10 core skills                          |
| 5    | Release       | v1.0.0 on npm                           |

---

## 10. Future Roadmap

### Version 1.1 (Month 2)

- **Additional Skills:** ~15 more skills (observer, service-contract, checkout, alpine, upgrade-planning, etc.)
- **Remote Skill Support:** Download skills from GitHub registries with allowlist
- **Skill Dependencies:** Automatic installation of dependent skills
- **Interactive Mode:** Guided setup wizard (Section 5.3)
- **Skill Bundles:** Pre-defined skill combinations (e.g., "Hyva Starter", "Module Complete")
- **`skill:update` command:** Update remote skill cache

### Version 1.2 (Month 3)

- **Full Catalog:** Remaining skills (devops, frontend, advanced performance, etc.)
- **Signature Verification:** Ed25519 signatures for registry trust
- **Skill Versioning:** Pin specific skill versions in config
- **Update Notifications:** Alert when skill updates are available

### Version 2.0 (Month 4-6)

- **Visual Studio Code Extension:** Skill browser and installer
- **Web Dashboard:** Browse and search skills online
- **Skill Analytics:** Track popular skills and usage
- **AI-Assisted Skill Generation:** Create skills from documentation

### Community Features

- **Skill Marketplace:** Community-contributed skills
- **Rating System:** Community ratings and reviews
- **Skill Templates:** Starter templates for creating skills
- **Documentation Site:** Searchable skill documentation

---

## Appendix A: Skill Writing Guidelines

### A.1 Instruction Writing

- Use imperative mood ("Create", "Implement", not "You should create")
- Be specific and actionable
- Include file paths where relevant
- Explain the "why" not just the "what"
- **Heading levels must start at `###` (h3) or deeper** — `#` and `##` are reserved for output templates during skill merging

### A.2 Code Examples

- Use realistic, production-ready code
- Include all necessary imports
- Always include `declare(strict_types=1)` in PHP examples
- Follow Magento coding standards
- Add comments for non-obvious logic

### A.3 Anti-patterns

- Explain why it's bad
- Show the wrong way briefly
- Provide the correct alternative
- Include real-world consequences

### A.4 Versioning Rules

- Patch: Typos, clarifications, minor additions
- Minor: New examples, new conventions, expanded instructions
- Major: Restructured skill, breaking changes to format

---

## Appendix B: Glossary

| Term               | Definition                                                       |
| ------------------ | ---------------------------------------------------------------- |
| **Skill**          | A unit of AI-readable knowledge about a specific Magento 2 topic |
| **Context File**   | Output file consumed by AI tools (CLAUDE.md, .cursorrules, etc.) |
| **Formatter**      | Component that converts skills to tool-specific format           |
| **Skill Registry** | Index of all available skills                                    |
| **Skill Bundle**   | Pre-defined collection of related skills                         |

---

## Appendix C: FAQ

**Q: How do skills differ from documentation?**
A: Skills are optimized for AI consumption—structured, imperative, with explicit conventions and anti-patterns. Documentation explains; skills instruct.

**Q: Can I create my own skills?**
A: Yes! Create YAML files following the schema and place them in a custom directory. Configure the path in `.magehub.yaml`.

**Q: How often are skills updated?**
A: Core skills are updated with each MageHub release when you upgrade the MageHub package itself. Remote/community skills can be refreshed separately with `magehub skill:update` in v1.1+.

**Q: Do I need to reinstall skills after updating MageHub?**
A: No. Core skills are bundled with the package. Updating MageHub updates all bundled skills. Remote skills can be updated separately with `skill:update` in v1.1+.

**Q: Can I use MageHub offline?**
A: Yes. Core skills (bundled with npm package) work completely offline. Only remote/community skills require network access.

---

_Document Version: 1.0.0-draft_  
_Last Updated: 2026-03-19_
