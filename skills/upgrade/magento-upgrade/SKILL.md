---
name: magento-upgrade
description: "Plan and execute Magento 2 upgrades with UCT analysis, dependency waves, compatibility fixes, and verification gates"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# Magento Upgrade

### Activation

#### Use When

- The task is to plan, assess, or execute an Adobe Commerce or Magento Open Source version upgrade, patch-line move, PHP/runtime upgrade, or UCT-driven compatibility pass.
- The task mentions composer constraints, Upgrade Compatibility Tool, dependency waves, system requirements, service upgrades, or setup:upgrade readiness.

#### Do Not Use When

- The task is a normal feature change or bug fix unrelated to platform/version compatibility.
- The user asks only for current-version module scaffolding, DI, plugin, setup, or performance work.

#### Required Inputs

- Current and target Magento/Adobe Commerce version, edition/package, PHP/runtime stack, deployment model, and environment wrapper.
- Custom module/theme inventory, third-party extension constraints, UCT availability, backup/rollback policy, and verification gates.

### Workflow

1. Run read-only inventory first, including Composer, platform versions, module status, custom code surface, and service dependencies.
2. Check current Adobe release notes and system requirements when target requirements are unknown.
3. Build dependency waves from module.xml, Composer requires, DI/plugins/observers, API surfaces, queues, cron, and theme dependencies.
4. Apply composer/platform and code compatibility changes one wave at a time with verification after each wave.
5. Keep a pending manual-work list for skipped or approval-sensitive items.

### Guardrails

- Do not run composer update to latest without an explicit target version and platform matrix.
- Ask before editing HIGH impact modules such as checkout, payment, customer auth, database migrations, core preferences, or production deployment scripts. (approval required)
- Ask before running setup:upgrade, schema/data patches, or automatic UCT refactor commands. (approval required)

### Verification

- Run composer validate/install/update dry-run or equivalent dependency checks appropriate to the wave.
- Run setup:di:compile, targeted tests, GraphQL/API/schema checks, or smoke tests after each changed wave.
- End with an exact verification matrix showing commands run, commands skipped, and residual risk.

### Output Contract

- Provide upgrade summary, readiness gates, wave plan, impact table, execution log, verification matrix, and pending manual work.
- Classify every module/package risk as HIGH, MEDIUM, or LOW with evidence.

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

### Conventions

- Start with read-only inventory and target system requirements before editing Composer constraints
  Example: Check package, PHP, database, search, cache, queue, and service versions before changing composer.json
  Rationale: Most upgrade failures come from platform mismatch or extension constraints, not from the final setup:upgrade command.
- Order custom module work by dependency waves
  Example: Fix Vendor_Foundation before Vendor_Checkout when checkout depends on foundation services
  Rationale: Dependency order keeps compile and runtime failures attributable to the smallest possible set of changes.
- Treat UCT output as evidence, not as the full migration plan
  Example: Correlate UCT critical/errors with manual scans for plugins, preferences, GraphQL resolvers, and PHP compatibility
  Rationale: Automated checks catch many known issues, but Magento projects fail upgrades through project-specific integrations and runtime behavior.
- Gate HIGH impact modules on explicit approval
  Example: Checkout, payment, customer auth, database migrations, and core class overrides need plan approval before edits
  Rationale: High-blast-radius areas can affect revenue, data integrity, or authentication and should not be changed silently.
- Verify after each wave with the smallest meaningful command set
  Example: Run setup:di:compile after DI signature fixes, targeted PHPUnit after service changes, and GraphQL compare after schema changes
  Rationale: Fast wave-level verification localizes failures and prevents a final all-or-nothing debugging session.
- Keep upgrade commits free of opportunistic refactors
  Example: Do not rename services or redesign repositories while replacing removed framework APIs
  Rationale: Upgrade branches are already risky. Extra refactors make rollback and review harder without improving compatibility.

### Examples

#### UCT analysis runner

Runs Upgrade Compatibility Tool checks for a target version and stores reports under var/upgrade-reports

```bash
#!/usr/bin/env bash
set -euo pipefail

target_version="${1:?Usage: uct-analysis.sh <target-version> [magento-root]}"
magento_root="${2:-$(pwd)}"
uct_dir="${UCT_DIR:-$magento_root/var/uct}"
report_dir="$magento_root/var/upgrade-reports/$target_version"

mkdir -p "$report_dir"

if [ ! -x "$uct_dir/bin/uct" ]; then
  composer create-project magento/upgrade-compatibility-tool "$uct_dir" \
    --repository https://repo.magento.com
  chmod +x "$uct_dir/bin/uct"
fi

"$uct_dir/bin/uct" upgrade:check "$magento_root" \
  -c "$target_version" \
  --ignore-current-version-compatibility-issues \
  --min-issue-level WARNING \
  > "$report_dir/uct-upgrade-check.txt"

"$uct_dir/bin/uct" list > "$report_dir/uct-commands.txt"

printf 'UCT reports written to %s\n' "$report_dir"
```

#### Upgrade plan template

Markdown template for target stack, readiness gates, wave plan, impact table, and pending manual work

```markdown
# Magento Upgrade Plan

## Summary

- Source version:
- Target version:
- Edition:
- Runtime changes:
- Custom modules:
- Third-party packages:
- Deployment model:

## Readiness Gates

- [ ] Clean working tree or dedicated upgrade branch
- [ ] Database backup policy confirmed
- [ ] Composer credentials available
- [ ] Target system requirements checked
- [ ] Third-party extension compatibility checked
- [ ] UCT availability decided

## Wave Plan

| Wave  | Scope                 | Modules or packages | Risk | Verification          |
| ----- | --------------------- | ------------------- | ---- | --------------------- |
| 0     | Platform and Composer |                     |      | composer install      |
| 1     | Base custom modules   |                     |      | setup:di:compile      |
| 2     | Dependent modules     |                     |      | targeted tests        |
| Final | Themes and deployment |                     |      | static-content deploy |

## Impact Table

| Module        | Impact | Evidence | Proposed fix | Verification |
| ------------- | ------ | -------- | ------------ | ------------ |
| Vendor_Module | HIGH   |          |              |              |

## Pending Manual Work

| Owner | Module/file | Risk | Next action |
| ----- | ----------- | ---- | ----------- |
```

#### Module wave report

Example wave breakdown that keeps dependency providers ahead of dependent checkout or API modules

```markdown
# Module Wave Report

## Wave 1

Modules with no custom-module dependencies. Fix these before dependent modules.

| Module            | Depends on    | Impact | Reason                          |
| ----------------- | ------------- | ------ | ------------------------------- |
| Vendor_Foundation | Magento_Store | MEDIUM | Plugin on core service contract |

## Wave 2

Modules that depend on Wave 1 providers.

| Module          | Depends on                          | Impact | Reason                               |
| --------------- | ----------------------------------- | ------ | ------------------------------------ |
| Vendor_Checkout | Vendor_Foundation, Magento_Checkout | HIGH   | Checkout plugin and GraphQL resolver |

## Stop Conditions

- Composer cannot resolve target package set.
- A HIGH impact module lacks approval for the proposed fix.
- `setup:di:compile` fails after a wave and the failure cannot be isolated.
- Database schema/data migration is not reversible without a fresh backup.
```

#### Composer platform constraint snippet

Example target package and PHP platform constraint to make dependency resolution deterministic

```json
{
  "require": {
    "magento/product-community-edition": "2.4.9"
  },
  "config": {
    "platform": {
      "php": "8.4.0"
    },
    "sort-packages": true
  }
}
```


### Anti-patterns

- Running composer update to latest without a target version and platform matrix: Composer may resolve a package set that does not match the deployed PHP, database, search, or cloud service versions.
  Solution: Choose the target Commerce patch line first, check Adobe system requirements, then update explicit constraints.
- Running setup:upgrade before dependency conflicts and compile failures are understood: Database and generated-code changes can make rollback harder while the codebase is still incompatible.
  Solution: Resolve Composer, PHP compatibility, and DI compile blockers before applying schema/data upgrades.
- Fixing every custom module in one large unreviewable diff: Failures become hard to isolate, and reviewers cannot distinguish compatibility fixes from unrelated refactors.
  Solution: Group modules into dependency waves and verify each wave before moving on.
- Trusting UCT as the only source of upgrade truth: Project-specific integrations, payment/shipping flows, queue consumers, and frontend behavior can fail outside static compatibility checks.
  Solution: Combine UCT with manual scans, targeted tests, smoke tests, and business-critical workflow verification.
- Ignoring runtime service upgrades while only changing PHP code: Search, database, queue, cache, and cloud service mismatches can fail in staging or production even when code compiles locally.
  Solution: Track service versions as first-class readiness gates and coordinate cloud support tickets where required.
- Disabling CSP, cache, 2FA, or validation globally to make the upgrade pass: Broad disables hide compatibility defects and can reduce security or performance after launch.
  Solution: Add narrow CSP rules, fix cache identities, preserve security controls, and document any temporary exception with an owner and expiry.

### File Templates

#### UPGRADE_PLAN.md

Path template:

```text
UPGRADE_PLAN.md
```

Upgrade planning worksheet for module waves, risk assessment, verification, and pending manual work

```markdown
# Magento Upgrade Plan

## Summary
- Source version: {{source_version}}
- Target version: {{target_version}}
- Edition: {{edition}}
- Runtime changes: {{runtime_changes}}

## Readiness Gates
- [ ] Clean upgrade branch
- [ ] Database backup confirmed
- [ ] Target system requirements checked
- [ ] Third-party extension compatibility checked
- [ ] Verification commands agreed

## Wave Plan
| Wave | Scope | Modules or packages | Risk | Verification |
| --- | --- | --- | --- | --- |
| 0 | Platform and Composer | {{platform_scope}} | {{platform_risk}} | composer install |

## Pending Manual Work
| Owner | Module/file | Risk | Next action |
| --- | --- | --- | --- |
```


### References

- [Adobe Commerce: Upgrade Compatibility Tool](https://experienceleague.adobe.com/en/docs/commerce-operations/upgrade-guide/upgrade-compatibility-tool/use-upgrade-compatibility-tool/run)
- [Adobe Commerce: System requirements](https://experienceleague.adobe.com/en/docs/commerce-operations/installation-guide/system-requirements)
- [Adobe Commerce: Upgrade prerequisites](https://experienceleague.adobe.com/en/docs/commerce-operations/upgrade-guide/prepare/prerequisites)
- [Adobe Commerce: Released versions](https://experienceleague.adobe.com/en/docs/commerce-operations/release/versions)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: Adobe Commerce upgrade guide, released versions, and system requirements, Upgrade Compatibility Tool documentation
