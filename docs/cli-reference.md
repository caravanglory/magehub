# MageHub CLI Reference

## Commands

### `setup:init`

Initialize MageHub in the current project.

```bash
magehub setup:init [--format=<format>]
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

### `skill:install`

Install one or more skills into `.magehub.yaml`.

```bash
magehub skill:install <skill-id...>
magehub skill:install --category=<category>
```

### `skill:remove`

Remove one or more installed skills from `.magehub.yaml`.

```bash
magehub skill:remove <skill-id...>
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

Generate an AI-tool context file from configured or explicitly selected skills.

```bash
magehub generate [--format=<format>] [--output=<path>] [--skills=<id,id>] [--no-examples] [--no-antipatterns]
```

## Supported Formats

- `claude`
- `opencode`
- `cursor`
- `codex`
- `qoder`
- `trae`
- `markdown`

## Exit Behavior

- invalid CLI inputs fail early
- missing/invalid `.magehub.yaml` returns a config error
- invalid skill files return a skill validation error
- duplicate local skill IDs fail registry creation
