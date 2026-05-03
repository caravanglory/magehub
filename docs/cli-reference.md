# MageHub CLI Reference

## Quick Start

The fastest path installs skills globally for the current user:

```bash
magehub install module-plugin performance
```

This creates or updates `~/.magehub/config.yaml` and renders the selected skills to the target tool's global location. If `--format` is omitted, MageHub uses `claude`.

Use `-c` / `--current` to install into the current project:

```bash
magehub install -c module-plugin performance
```

Current-project installs create `.magehub.yaml` if missing, render the selected skills to disk, and update `.git/info/exclude` (the repo-local, untracked ignore file) so generated output is ignored without touching the shared `.gitignore`. If `--format` is omitted, MageHub uses `claude`.

## Commands

### `setup:init` (optional)

Create `.magehub.yaml` without installing skills. Skipping this is fine — `skill:install --current` bootstraps the config on first use.

```bash
magehub setup:init [--format=<format>] [--no-git-exclude]
```

### `skill:list`

List skills from the local registry.

```bash
magehub skill:list [--category=<category>] [--format=table|json]
```

### `skill:search`

Search skills by keyword across `id`, `name`, `description`, and `tags`.

```bash
magehub skill:search <keyword> [--category=<category>]
```

### `skill:show`

Show details for a single skill.

```bash
magehub skill:show <skill-id>
```

### `skill:install` (alias: `install`)

Install one or more skills globally by default, or into `.magehub.yaml` with `--current`.

```bash
magehub install <skill-id...>                     # global install
magehub install --category=<category>             # global category install
magehub install <skill-id...> --format=<format>   # set global output format
magehub install -c <skill-id...>                  # current project install
magehub install -c <skill-id...> --format=<format> # set project output format
magehub install -c <skill-id...> --no-write       # update project config only
magehub install -c <skill-id...> --no-git-exclude # skip .git/info/exclude update
```

### `skill:remove` (alias: `remove`)

Remove one or more installed skills from `.magehub.yaml` and clean their rendered files.

```bash
magehub remove <skill-id...>
magehub remove <skill-id...> --no-write           # skip file cleanup
```

### `skill:verify`

Validate skill YAML against schema and heading rules.

```bash
magehub skill:verify
magehub skill:verify --all
magehub skill:verify --skill=<skill-id>
```

### `config:show`

Print the resolved project configuration.

```bash
magehub config:show
```

### `config:validate`

Validate `.magehub.yaml`.

```bash
magehub config:validate
```

### `generate`

Re-render all configured skills. Useful after editing `.magehub.yaml` by hand or switching formats.

```bash
magehub generate [--format=<format>] [--output=<path>] [--skills=<id,id>] [--no-examples] [--no-antipatterns]
```

## Output Layout by Format

| Format     | Strategy       | Default output                   |
| ---------- | -------------- | -------------------------------- |
| `claude`   | per-skill file | `.claude/skills/<id>/SKILL.md`   |
| `opencode` | per-skill file | `.opencode/skills/<id>/SKILL.md` |
| `trae`     | per-skill file | `.trae/rules/<id>.md`            |
| `cursor`   | single file    | `.cursorrules`                   |
| `codex`    | single file    | `AGENTS.md`                      |
| `qoder`    | single file    | `.qoder/context.md`              |

Per-skill formats write one file per installed skill with YAML frontmatter. Single-file formats concatenate all skills into one document.

## Exit Behavior

- invalid CLI inputs fail early
- missing/invalid `.magehub.yaml` returns a config error (except `skill:install --current`, which bootstraps instead)
- invalid skill files return a skill validation error
- duplicate local skill IDs fail registry creation
