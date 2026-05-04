# MageHub Implementation Backlog

> Issue-ready backlog derived from the proposal and implementation checklist

## Backlog Conventions

- **Priority**: P0 = unblocker, P1 = core MVP, P2 = polish
- **Size**: S / M / L
- **Depends on**: issues that should land first

---

## MH-001 — Bootstrap TypeScript CLI Workspace

- **Priority:** P0
- **Size:** M
- **Depends on:** none

### Scope

Create the npm package, TypeScript config, build/test/lint setup, and CLI entrypoint.

### Acceptance Criteria

- `npm install` succeeds
- `npm run build` outputs `dist/index.js`
- `npm run test` and `npm run lint` pass
- `magehub --help` runs from built output

---

## MH-002 — Add JSON Schemas for Skills and Config

- **Priority:** P0
- **Size:** M
- **Depends on:** MH-001

### Scope

Create `schema/skill.schema.json` and `schema/config.schema.json` from the proposal and keep them aligned with TypeScript types.

### Acceptance Criteria

- schemas are valid JSON Schema documents
- valid fixtures pass
- invalid fixtures report actionable validation errors

---

## MH-003 — Implement Skill and Config Types

- **Priority:** P0
- **Size:** S
- **Depends on:** MH-002

### Scope

Add `src/types/skill.ts`, `src/types/config.ts`, and shared exports.

### Acceptance Criteria

- types match schema-required fields
- format/tool enums align with documented v1.0 support

---

## MH-004 — Build Skill Loader and Registry

- **Priority:** P1
- **Size:** M
- **Depends on:** MH-002, MH-003

### Scope

Load bundled skills from `skills/<category>/<skill-id>/skill.yaml`, index them, and support list/search/filter operations.

### Acceptance Criteria

- loader parses YAML safely
- registry lists all bundled skills
- search works across id/name/description/tags

---

## MH-005 — Implement Skill Validation with Heading Warnings

- **Priority:** P1
- **Size:** M
- **Depends on:** MH-002, MH-003

### Scope

Validate skill YAML against schema and emit warnings for `#` / `##` inside `instructions`.

### Acceptance Criteria

- schema errors and heading warnings are reported separately
- invalid skills exit with the documented skill error behavior

---

## MH-006 — Implement Config Manager

- **Priority:** P1
- **Size:** M
- **Depends on:** MH-002, MH-003

### Scope

Read, write, merge, and persist `.magehub.yaml` with sane defaults.

### Acceptance Criteria

- missing config is handled cleanly
- installs/removals are idempotent
- config validation is reusable from commands

---

## MH-007 — Wire Core v1.0 CLI Commands

- **Priority:** P1
- **Size:** L
- **Depends on:** MH-004, MH-005, MH-006

### Scope

Implement `setup:init`, `skill:list`, `skill:search`, `skill:show`, `skill:install`, `skill:remove`, `config:show`, `config:validate`, and `skill:verify`.

### Acceptance Criteria

- each command matches documented name/alias/options
- exit codes follow the proposal
- command help text is usable and consistent

---

## MH-008 — Implement Shorthand Resolution and Shared Logging

- **Priority:** P1
- **Size:** S
- **Depends on:** MH-001

### Scope

Add longest-unique-prefix shorthand resolution and CLI logging helpers.

### Acceptance Criteria

- ambiguous shorthands fail with exit code `1`
- normal output uses stdout and errors use stderr

---

## MH-009 — Create Base Formatter and Template System

- **Priority:** P1
- **Size:** M
- **Depends on:** MH-004, MH-005

### Scope

Build the formatter abstraction, template rendering utilities, and shared merge model.

### Acceptance Criteria

- formatters can receive merged skill data
- template rendering is deterministic and testable

---

## MH-010 — Implement Tool-Specific Output Formatters

- **Priority:** P1
- **Size:** L
- **Depends on:** MH-009

### Scope

Implement Claude, OpenCode, Codex, and Qoder formatters.

### Acceptance Criteria

- default output paths match the proposal
- Codex uses `AGENTS.md`
- each formatter has at least one snapshot/integration test

---

## MH-011 — Implement `generate` with Merge Logic

- **Priority:** P1
- **Size:** L
- **Depends on:** MH-009, MH-010, MH-006

### Scope

Generate context files from installed or explicitly selected skills, including heading normalization and option flags.

### Acceptance Criteria

- `magehub generate` works from config
- `--format`, `--output`, `--skills`, `--no-examples`, `--no-antipatterns` work
- generated files are stable in tests

---

## MH-012 — Author 10 Bundled v1.0 Skills

- **Priority:** P1
- **Size:** L
- **Depends on:** MH-002

### Scope

Create the 10 MVP skills documented in the proposal.

### Acceptance Criteria

- all 10 skills validate
- all 10 skills can be installed and generated together
- examples are Magento-specific and production-like

---

## MH-013 — Add Cross-Platform QA Coverage

- **Priority:** P2
- **Size:** M
- **Depends on:** MH-007, MH-011, MH-012

### Scope

Add tests and manual validation for macOS, Linux, and Windows path behavior plus real Magento smoke tests.

### Acceptance Criteria

- CI passes on supported platforms
- at least one real Magento repo is used for manual smoke validation

---

## MH-014 — Prepare Release Automation and Docs

- **Priority:** P2
- **Size:** M
- **Depends on:** MH-007, MH-011, MH-012, MH-013

### Scope

Finish README, CLI reference, skill authoring docs, CI, release workflow, and changelog preparation.

### Acceptance Criteria

- a new contributor can bootstrap the project from docs alone
- CI and release workflows exist
- npm package contents are correct
