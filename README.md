# MageHub

MageHub is a TypeScript CLI for packaging Magento 2 AI coding skills as reusable context files for tools like Claude Code, OpenCode, Cursor, Codex, Qoder, and Trae.

Project site: [magehub.org](https://magehub.org)

## Status

MageHub now supports a complete **local v1.0 workflow**:

- 11 bundled Magento 2 core skills
- skill listing, search, show, install, remove, and verification
- config init/show/validate
- context generation for multiple AI tool formats
- JSON Schema validation for skill YAML and project config

## Install

Install globally from npm:

```bash
npm install -g magehub
```

Or run ad-hoc without installing:

```bash
npx magehub --help
```

## Quick Start

One command is enough to install skills and render them for your AI tool:

```bash
magehub install module-plugin performance-caching
```

On first run, MageHub auto-detects your tool from the project (e.g. existing `.claude/`, `.cursorrules`, `AGENTS.md`), creates `.magehub.yaml`, writes the rendered files, and updates `.gitignore`. Use `--format=<tool>` to override detection.

Other common tasks:

```bash
magehub skill:list                     # browse bundled skills
magehub skill:search plugin            # find skills by keyword
magehub skill:remove module-plugin     # uninstall and clean output
magehub generate                       # re-render everything from .magehub.yaml
magehub setup:init --format=cursor     # optional: create .magehub.yaml without installing skills
```

Generated output layout by format:

| Format     | Strategy       | Default output                   |
| ---------- | -------------- | -------------------------------- |
| `claude`   | per-skill file | `.claude/skills/<id>/SKILL.md`   |
| `opencode` | per-skill file | `.opencode/skills/<id>/SKILL.md` |
| `trae`     | per-skill file | `.trae/rules/<id>.md`            |
| `cursor`   | single file    | `.cursorrules`                   |
| `codex`    | single file    | `AGENTS.md`                      |
| `qoder`    | single file    | `.qoder/context.md`              |
| `markdown` | single file    | `MAGEHUB.md`                     |

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
- `devops-warden`

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
