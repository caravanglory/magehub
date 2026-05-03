# MageHub

MageHub is a TypeScript CLI for packaging Magento 2 AI coding skills as reusable context files for tools like Claude Code, OpenCode, Cursor, Codex, Qoder, and Trae.

Project site: [magehub.org](https://magehub.org)

## Status

MageHub now supports a complete **local v1.0 workflow**:

- 12 bundled Magento 2 core skills
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

By default, MageHub installs skills globally for the current user:

```bash
magehub install module-plugin performance
```

On first global run, MageHub creates `~/.magehub/config.yaml` and writes the rendered output to the selected tool's global location. If `--format` is omitted, MageHub uses `claude`.

Use `-c` / `--current` to install into the current project instead:

```bash
magehub install -c module-plugin performance
```

Project installs create or update `.magehub.yaml`, write the rendered files into the current project, and update `.git/info/exclude` so generated output stays local to your clone. If `--format` is omitted, MageHub uses `claude`; pass `--format=codex` or another supported format when you want a different target.

Other common tasks:

```bash
magehub skill:list                     # browse bundled skills
magehub skill:search plugin            # find skills by keyword
magehub skill:remove -g module-plugin  # uninstall globally and clean output
magehub generate                       # re-render current project from .magehub.yaml
magehub setup:init --format=cursor     # optional: create .magehub.yaml without installing skills
```

Global output layout by format:

| Format     | Strategy       | Global output                      |
| ---------- | -------------- | ---------------------------------- |
| `claude`   | per-skill file | `~/.claude/skills/<id>/SKILL.md`   |
| `opencode` | per-skill file | `~/.opencode/skills/<id>/SKILL.md` |
| `trae`     | per-skill file | `~/.trae/rules/<id>.md`            |
| `cursor`   | single file    | `~/.cursorrules`                   |
| `codex`    | single file    | `~/.codex/AGENTS.md`               |
| `qoder`    | per-skill file | `~/.qoder/skills/<id>/SKILL.md`    |

## Bundled v1.0 Skills

- `module-scaffold`
- `module-plugin`
- `module-di`
- `module-setup`
- `admin-ui-grid`
- `api-graphql-resolver`
- `hyva-module-compatibility`
- `testing-phpunit`
- `performance`
- `standards-coding`
- `mage-review`
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
