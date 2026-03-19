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
- `instructions`

## Recommended Fields

- `tags`
- `magento_versions`
- `conventions`
- `examples`
- `anti_patterns`
- `references`
- `compatibility`

## Heading Rule

Inside `instructions`, headings should start at `###` or deeper.

Why:

- output templates own the document-level `#` and section-level `##`
- `skill:verify` warns on `#` and `##` inside skill instructions

## Example

```yaml
id: module-plugin
name: Plugin Development
version: "1.0.0"
category: module
description: Implement Magento 2 plugins following best practices

instructions: |
  ### Plugin Development

  Use before, after, and around plugins carefully.
```

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
