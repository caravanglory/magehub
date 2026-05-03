# MageHub Implementation Checklist

> Execution-ready checklist derived from `docs/PROPOSAL.md`

## Goal

Ship a working MageHub v1.0 CLI that:

- loads bundled core skills from YAML
- validates skills and project config against JSON Schema
- installs/removes skills in `.magehub.yaml`
- generates context files for supported AI tools
- ships 10 production-ready core skills

## Current Repo Baseline

As of the proposal draft, the repository contains the proposal document but not the implementation files described in the target project structure. Start by creating the project skeleton before attempting feature work.

---

## Phase 0 — Repo Bootstrap

### Tasks

- [x] Create `package.json` with Node 18+, ESM, `magehub` bin entry, scripts for build/test/lint
- [x] Create `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- [x] Add `.editorconfig`, `.gitignore`, `.prettierrc`, `eslint` config
- [x] Create top-level directories: `src/`, `schema/`, `skills/`, `templates/`, `tests/`, `docs/`

### Acceptance Criteria

- [x] `npm install` succeeds
- [x] `npm run build` produces `dist/index.js`
- [x] `npm run test` executes even if tests are initially placeholders
- [x] `npm run lint` runs without config errors

### Deliverables

- `package.json`
- TypeScript/build/test/lint config files
- initial folder structure

---

## Phase 1 — Schemas and Types

### Tasks

- [x] Create `schema/skill.schema.json` from proposal section 4.1
- [x] Create `schema/config.schema.json` from proposal section 4.3
- [x] Add TypeScript types in `src/types/skill.ts` and `src/types/config.ts`
- [x] Ensure schema and TypeScript types match exactly on required fields and enums
- [x] Decide and document whether recommended fields remain optional in schema

### Acceptance Criteria

- [x] Valid sample skill YAML passes validation
- [x] Invalid skill YAML reports all schema errors
- [x] Valid `.magehub.yaml` passes validation
- [x] Invalid config exits with documented config error behavior

### Deliverables

- JSON Schema files
- strongly typed interfaces/types
- test fixtures for valid/invalid YAML

---

## Phase 2 — Core Loading and Validation

### Tasks

- [x] Implement `src/core/skill-loader.ts`
- [x] Implement `src/core/skill-registry.ts`
- [x] Implement `src/core/skill-validator.ts`
- [x] Implement `src/core/config-manager.ts`
- [x] Add heading-level verification for `instructions` (`#` / `##` warning)
- [x] Support bundled skills lookup from `skills/<category>/<skill-id>/skill.yaml`

### Acceptance Criteria

- [x] Loader can read all bundled skill YAML files
- [x] Registry can list by category and search by keyword/tag
- [x] Validator returns schema errors and heading warnings separately
- [x] Config manager can read, write, merge, and persist `.magehub.yaml`

### Deliverables

- working core modules
- fixtures for loader/validator tests
- documented warning/error model

---

## Phase 3 — CLI Skeleton

### Tasks

- [x] Implement CLI bootstrap in `src/index.ts` and `src/cli.ts`
- [x] Configure Commander commands and aliases
- [x] Implement shorthand resolution logic from proposal section 5.4
- [x] Add shared logging/output helpers
- [x] Standardize exit codes and stderr/stdout behavior

### Acceptance Criteria

- [x] `magehub --help` shows all v1.0 commands
- [x] Ambiguous shorthand exits with code `1`
- [x] Missing config exits with code `2`
- [x] Skill/schema errors exit with code `3`
- [x] Output write failures exit with code `4`

### Deliverables

- runnable CLI shell
- consistent command registration
- reusable logging/error utilities

---

## Phase 4 — v1.0 Commands

### Tasks

#### Project Setup

- [x] `setup:init`
- [x] create `.magehub.yaml`
- [x] optionally update `.gitignore`

#### Read/Inspect Commands

- [x] `skill:list`
- [x] `skill:search`
- [x] `skill:show`
- [x] `config:show`
- [x] `config:validate`
- [x] `skill:verify`

#### Write Commands

- [x] `skill:install`
- [x] `skill:remove`

### Acceptance Criteria

- [x] `setup:init` creates a valid config file
- [x] `skill:list` supports category filtering and table/json output
- [x] `skill:search` searches name, description, tags
- [x] `skill:show` renders metadata, conventions, examples, anti-pattern counts
- [x] `skill:install` updates `.magehub.yaml` idempotently
- [x] `skill:remove` removes skills without corrupting config
- [x] `skill:verify` validates installed or specified skills and prints warnings

### Deliverables

- complete v1.0 command surface except `generate`
- CLI integration tests for success and failure paths

---

## Phase 5 — Formatters and Generation

### Tasks

- [x] Create base formatter abstraction
- [x] Add Handlebars templates:
  - [x] `templates/claude.hbs`
  - [x] `templates/opencode.hbs`
  - [x] `templates/cursor.hbs`
  - [x] `templates/codex.hbs`
  - [x] `templates/qoder.hbs`
  - [x] `templates/trae.hbs`
- [x] Implement formatter classes under `src/formatters/`
- [x] Implement merge rules for instructions, conventions, examples, anti-patterns
- [x] Implement heading normalization during merge
- [x] Implement format auto-detection fallback
- [x] Implement `generate`

### Acceptance Criteria

- [x] `magehub generate` works from `.magehub.yaml`
- [x] `--format` overrides detected/default format
- [x] `--output` writes to custom path
- [x] `--no-examples` and `--no-antipatterns` affect output correctly
- [x] Codex output defaults to `AGENTS.md`
- [x] Generated files match documented locations and structures

### Deliverables

- formatter implementations
- template files
- end-to-end generate tests for each supported format

---

## Phase 6 — 10 Core Skills

### Required v1.0 Skills

- [x] `module-scaffold`
- [x] `module-plugin`
- [x] `module-di`
- [x] `module-setup`
- [x] `admin-ui-grid`
- [x] `api-graphql-resolver`
- [x] `hyva-module-compatibility`
- [x] `testing-phpunit`
- [x] `performance`
- [x] `standards-coding`

### For Each Skill

- [x] Create `skill.yaml` in the correct category directory
- [x] Include required metadata and instructions
- [x] Include conventions
- [x] Include realistic code examples
- [x] Include anti-patterns with rationale
- [x] Include references to official documentation where possible
- [x] Verify headings start at `###` or deeper inside `instructions`
- [x] Validate against schema

### Acceptance Criteria

- [x] All 10 skills pass `skill:verify`
- [x] All 10 skills can be installed and generated together
- [x] No generated output has heading collisions
- [x] Code examples are production-like and Magento-specific

### Deliverables

- complete bundled v1.0 skill set
- skill fixtures usable in formatter and integration tests

---

## Phase 7 — Quality Assurance

### Tasks

- [x] Add unit tests for loader, validator, config manager, shorthand resolution
- [x] Add command integration tests
- [x] Add formatter snapshot tests
- [x] Test on macOS, Linux, Windows path behavior
- [x] E2E smoke test against simulated Magento 2 project (automated via `tests/e2e/smoke.test.ts`)

### Acceptance Criteria

- [x] `npm run test` passes (220 tests across 12 files)
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] All generated outputs are stable in snapshots (18 snapshots)
- [x] Automated smoke test validates all 6 format outputs are structurally usable (see `test-results/smoke-report.md` for optional visual review)

---

## Phase 8 — Release Readiness

### Tasks

- [ ] Write `README.md` with install, quick start, supported formats, examples
- [ ] Write `docs/cli-reference.md`
- [ ] Write `docs/creating-skills.md`
- [ ] Write `CONTRIBUTING.md`
- [ ] Add CI workflow for build/test/lint
- [ ] Add release workflow for npm publish
- [ ] Prepare `CHANGELOG.md`

### Acceptance Criteria

- [ ] Fresh user can install and run `setup:init`
- [ ] CI passes on pull request
- [ ] npm package includes `dist`, `skills`, `templates`, `schema`
- [ ] release checklist completed for `v1.0.0`

---

## Suggested Execution Order

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4 (except `generate`)
6. Phase 6 in parallel with late Phase 4
7. Phase 5
8. Phase 7
9. Phase 8

## Critical Risks to Watch

- Keep v1.0 strictly limited to bundled offline skills
- Do not mix v1.1 remote registry behavior into v1.0 command behavior
- Keep `AGENTS.md` as the Codex default output path everywhere
- Enforce heading normalization consistently in validator and formatter
- Avoid drift between JSON Schema, TypeScript types, and documentation examples

## Definition of Done for v1.0

MageHub v1.0 is done when:

- [x] all 10 bundled skills exist and validate
- [x] all documented v1.0 commands work
- [x] context generation works for every supported tool format
- [ ] tests/build/lint pass in CI
- [ ] documentation matches actual behavior
