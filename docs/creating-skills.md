# Creating Skills for MageHub

## Goal

MageHub skills are YAML files that teach AI tools how to work on Magento 2 tasks safely and consistently.

## Location

Bundled skills live under:

```text
skills/<category>/<skill-id>/skill.yaml
```

Project-local custom skills can live in any project-local directory referenced by `.magehub.yaml` via `custom_skills_path`.

## Required Fields

- `id`
- `name`
- `version`
- `category`
- `description`
- `instructions` or `instructions_file` (exactly one)

## Recommended Fields

- `tags`
- `magento_versions`
- `conventions`
- `examples`
- `anti_patterns`
- `references`
- `compatibility`

Valid `compatibility` values are `claude`, `opencode`, `codex`, and `qoder`.
Legacy `cursor` entries are normalized to `claude` when skills are loaded.

## Heading Rule

Inside `instructions`, headings should start at `###` or deeper.

Why:

- output templates own the document-level `#` and section-level `##`
- `skill:verify` warns on `#` and `##` inside skill instructions

## Example

### Inline Format (Original)

```yaml
id: module-plugin
name: Plugin Development
version: '1.0.0'
category: module
description: Implement Magento 2 plugins following best practices

instructions: |
  ### Plugin Development

  Use before, after, and around plugins carefully.
```

### Hybrid Format (Recommended)

Use `instructions_file` to reference an external Markdown file and `code_file`
to reference external code files. This keeps YAML for structured metadata and
Markdown/code in their native formats.

```yaml
id: module-plugin
name: Plugin Development
version: '1.0.0'
category: module
description: Implement Magento 2 plugins following best practices

instructions_file: instructions.md

tags:
  - plugin
  - interceptor

examples:
  - title: Before Plugin
    code_file: examples/before-plugin.php
    language: php

  - title: Quick Snippet
    # Inline code still works for short examples
    code: |
      <?php echo "hello";
    language: php

conventions:
  - rule: Always use service contracts
    rationale: They are the only stable API

references:
  - title: Adobe Commerce Docs
    url: https://developer.adobe.com/commerce/php/
```

#### Recommended Directory Structure

```text
skills/module/my-skill/
  skill.yaml           # Metadata, conventions, anti-patterns, references
  instructions.md      # Main instructions content (Markdown)
  examples/
    before-plugin.php       # Code example files
    after-plugin.php
    di-xml-configuration.xml
```

#### Mutual Exclusivity Rules

- `instructions` and `instructions_file` are **mutually exclusive** — providing
  both causes a schema validation error. Exactly one must be present.
- `code` and `code_file` inside each example entry are also **mutually
  exclusive** — each example must have exactly one.
- File paths are resolved **relative to the `skill.yaml` directory**.
- After normalization, the `Skill` object always has `instructions: string` and
  `examples[].code: string` — downstream consumers (templates, renderer,
  registry) never see file references.

## Local Custom Skill Policy

- custom skills must stay inside the project root
- duplicate `skill.id` values are not allowed
- skills must pass schema validation before generation and verification workflows

## Validation Workflow

Use:

```bash
magehub skill:verify --all
```

This validates schema shape and warns on heading-level violations.
