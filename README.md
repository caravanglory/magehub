# MageHub

MageHub is a TypeScript CLI for packaging Magento 2 AI coding skills as reusable context files for tools like Claude Code, OpenCode, Cursor, Codex, Qoder, and Trae.

Project site: [magehub.org](https://magehub.org)

## Status

MageHub now supports a complete **local v1.0 workflow**:

- 10 bundled Magento 2 core skills
- skill listing, search, show, install, remove, and verification
- config init/show/validate
- context generation for multiple AI tool formats
- JSON Schema validation for skill YAML and project config

## Quick Start

```bash
npm install
npm run build
node ./dist/index.js setup:init --format=claude
node ./dist/index.js skill:list
node ./dist/index.js skill:install module-plugin performance-caching
node ./dist/index.js generate
```

Generated output defaults by format:

- `claude` → `CLAUDE.md`
- `opencode` → `.opencode/skills/magehub.md`
- `cursor` → `.cursorrules`
- `codex` → `AGENTS.md`
- `qoder` → `.qoder/context.md`
- `trae` → `.trae/rules/magehub.md`
- `markdown` → `MAGEHUB.md`

## Bundled v1.0 Skills

- `module-scaffold`
- `module-plugin`
- `module-di`
- `module-setup`
- `admin-ui-grid`
- `api-graphql-resolver`
- `hyva-module-compatibility`
- `testing-phpunit`
- `performance-caching`
- `standards-coding`

## Supported Commands

- `setup:init`
- `skill:list`
- `skill:search`
- `skill:show`
- `skill:install`
- `skill:remove`
- `skill:verify`
- `config:show`
- `config:validate`
- `generate`

## Development

```bash
npm install
npm run build
npm run test
npm run lint
```

## Local Custom Skills

You can point `.magehub.yaml` at a project-local custom skills directory with `custom_skills_path`.

Current local policy:

- the path is resolved relative to the project root
- the path must remain inside the project root
- duplicate skill IDs across bundled/custom skills are rejected

## Documentation

- `docs/PROPOSAL.md`
- `docs/IMPLEMENTATION_CHECKLIST.md`
- `docs/IMPLEMENTATION_BACKLOG.md`
- `docs/cli-reference.md`
- `docs/creating-skills.md`
