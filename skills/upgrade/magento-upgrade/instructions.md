### Upgrade Operating Principle

Treat a Magento upgrade as a controlled migration program, not a single
`composer update`. Start with inventory, version requirements, dependency
ordering, and risk classification. Only move into edits after the target stack,
custom code impact, and verification gates are explicit.

Use this skill when the user asks to upgrade Adobe Commerce or Magento Open
Source, move between 2.4.x patch/minor versions, apply security patch lines,
raise the PHP/runtime platform, or assess upgrade readiness for custom modules.

### Inputs To Collect

Before proposing changes, collect and report:

1. Current and target Commerce version, edition, and package name
   (`magento/product-community-edition` or `magento/product-enterprise-edition`).
2. Runtime versions: PHP, Composer, MySQL or MariaDB, OpenSearch or
   Elasticsearch, Redis or Valkey, RabbitMQ, Varnish, Node tooling, and web
   server.
3. Deployment model: on-prem, Adobe Commerce Cloud, Kubernetes, Docker Compose,
   DDEV, custom container wrapper, or other runtime setup.
4. Custom code surface: `app/code`, local Composer path repositories, custom
   themes, patches, preference/plugin/observer counts, GraphQL/Web API exposure,
   cron jobs, message queues, and payment/shipping integrations.
5. Third-party extension constraints and vendor compatibility notes.
6. Whether Adobe's Upgrade Compatibility Tool is available. It is available for
   Adobe Commerce instances and may require Marketplace credentials.

When target requirements are unknown, check the current Adobe release notes and
system requirements first. Do not rely on stale version matrices embedded in
old prompts.

### Discovery Workflow

Run read-only discovery first:

```bash
git status --short
composer show magento/product-community-edition magento/product-enterprise-edition --locked
composer show --platform
composer outdated "magento/*" "laminas/*" "symfony/*" --direct
php -v
composer -V
bin/magento --version
bin/magento module:status
bin/magento setup:db:status
bin/magento config:show catalog/search/engine
find app/code -mindepth 2 -maxdepth 2 -type d | sort
```

If a command is environment-specific, adapt through the project's own wrapper
(`ddev exec`, `docker compose exec`, container shell, CI task, or deployment
script). Avoid running upgrade commands on production.

### Dependency And Wave Planning

Build a module dependency graph from:

- `etc/module.xml` `<sequence>` declarations.
- Module `composer.json` `require` constraints.
- DI preferences, plugins, observers, cron consumers, message queue topics, and
  GraphQL/Web API contracts.
- Theme inheritance and Hyva/Luma compatibility boundaries.

Process providers before dependents. A typical plan:

- Wave 0: platform and Composer constraints, third-party extension
  compatibility, service version changes, and patch inventory.
- Wave 1: custom modules with no custom-module dependencies.
- Wave 2+: modules that depend on earlier waves.
- Final wave: themes, static content, GraphQL schema comparisons, full
  regression tests, and deployment scripts.

Keep wave sizes small enough that failures can be diagnosed without reading a
monolithic diff.

### Upgrade Compatibility Tool Workflow

Use UCT when available, but treat it as one signal rather than the entire
analysis. Cross-check UCT output with manual scans and runtime verification.

Core UCT checks:

```bash
bin/uct upgrade:check <magento-root> -c <target-version>
bin/uct upgrade:check --ignore-current-version-compatibility-issues <magento-root> -c <target-version>
bin/uct dbschema:diff <magento-root> <vanilla-target-root>
bin/uct core:code:changes <magento-root> <vanilla-target-root>
bin/uct graphql:compare <current-schema> <target-schema>
```

Use `refactor` only after previewing scope and after the user agrees to the
automatic changes. Keep tool output attached to the module or package it affects
instead of dumping one undifferentiated report.

### Manual Impact Scan

For each custom module, inspect:

- Core class inheritance, preferences, and plugins on Magento framework/core
  classes.
- Use of non-API concrete classes where service contracts exist.
- Removed or deprecated namespaces such as legacy `Zend_*` references, outdated
  Laminas bridges, and old serializer usage.
- PHP target-version compatibility: dynamic properties, changed internal
  signatures, stricter typing, nullable/union type interactions, and deprecated
  functions.
- Declarative schema changes, data patches, recurring patches, and direct SQL.
- Web API and GraphQL schema changes, resolver batching, ACL, and integration
  token behavior.
- Frontend dependencies: RequireJS, Knockout UI components, jQuery UI widgets,
  CSP whitelists, static content deployment, and Hyva overrides.
- Search, queue, cache, session, and indexer configuration.

### Impact Classification

Classify each module with evidence:

- HIGH: Extends or overrides changed core classes, depends on removed APIs,
  changes database shape, handles checkout/payment/customer data, modifies
  authentication, or fails UCT with critical/errors.
- MEDIUM: Uses deprecated APIs that still have a replacement path, has DI
  signature drift, touches frontend build/CSP/search/indexing, or has warnings
  from UCT/manual scans.
- LOW: No direct affected core dependencies and only needs PHP/platform syntax
  verification, smoke tests, or constraint updates.

HIGH impact modules require explicit user approval before edits. MEDIUM impact
modules should get a concise summary before changes. LOW impact modules can be
handled in batch if the repository conventions allow it.

### Execution Protocol

1. Confirm a clean rollback point: branch name, `composer.lock` snapshot,
   database backup policy, media/config backup policy, and deployment freeze
   window.
2. Present the upgrade plan before edits: target stack, module waves, high-risk
   areas, expected commands, and stop conditions.
3. Change Composer constraints deliberately. Prefer explicit target constraints
   over broad "latest" updates.
4. Apply fixes one wave at a time. Do not mix unrelated refactors into upgrade
   commits.
5. After each module or wave, run the smallest meaningful verification:
   `setup:di:compile`, targeted PHPUnit/integration tests, PHPStan/Psalm if the
   project uses them, GraphQL schema checks, or relevant smoke tests.
6. Run full verification only after dependency resolution and module waves are
   stable.
7. Keep a pending manual work list instead of hiding skipped issues.

### Verification Gates

Use the project's actual toolchain, but cover these gates when applicable:

```bash
composer validate
composer install
bin/magento setup:upgrade --keep-generated
bin/magento setup:di:compile
bin/magento setup:static-content:deploy -f
bin/magento indexer:reindex
bin/magento cache:flush
vendor/bin/phpunit
vendor/bin/phpstan analyse
```

For Adobe Commerce Cloud, also check `.magento.app.yaml`, `services.yaml`,
ECE-Tools compatibility, build hooks, deploy hooks, and service upgrade tickets.

### Fix Guidance

Prefer narrow compatibility fixes:

- Replace removed class references with supported framework or Laminas classes.
- Replace PHP serialized storage usage with
  `Magento\Framework\Serialize\Serializer\Json` when data shape allows it.
- Update method signatures to match parent/interface changes exactly.
- Convert dynamic properties to declared properties or typed extension storage.
- Replace direct ObjectManager fallback code with constructor injection or
  proxy/factory patterns.
- Move customizations out of core patches where possible and document remaining
  patch files.
- Add CSP whitelist entries intentionally and avoid disabling CSP globally.
- Keep database migrations idempotent and data-safe.

### Output Contract

When reporting, use this shape:

- Upgrade Summary: current version, target version, edition, runtime stack,
  custom module count, third-party package count.
- Readiness Gates: blockers, missing credentials, missing backups, service
  version gaps.
- Wave Plan: module list per wave with dependency reason.
- Impact Table: module, impact level, evidence, proposed fix, verification.
- Execution Log: commands run, files changed, tests run, unresolved issues.
- Pending Manual Work: issue owner, module/file, risk, recommended next action.

End every upgrade session with the exact verification status. If a command was
not run, say why.
