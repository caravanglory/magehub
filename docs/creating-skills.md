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
- `use_when`
- `do_not_use_when`
- `required_inputs`
- `workflow`
- `guardrails`
- `verification`
- `output_contract`
- `conventions`
- `examples`
- `anti_patterns`
- `files`
- `references`
- `freshness`
- `compatibility`

Valid `compatibility` values are `agents`, `claude`, `opencode`, `codex`, and `qoder`.

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

use_when:
  - Creating or modifying Magento plugin/interceptor behavior
do_not_use_when:
  - The target method is final, static, private, protected, or a constructor
required_inputs:
  - Target class, public method, desired behavior, and area scope
workflow:
  - Inspect target method signature and existing plugins
  - Choose before, after, or around plugin based on the least invasive change
  - Register the plugin in the narrowest applicable di.xml scope
guardrails:
  - rule: Around plugins must call and return $proceed() unless deliberately blocking execution
  - rule: Ask before pluginizing checkout, payment, customer auth, inventory, or price calculation flows
    approval_required: true
verification:
  - Run bin/magento setup:di:compile or the project wrapper
output_contract:
  - State target class/method, plugin type, di.xml scope, and verification result
freshness:
  last_reviewed: '2026-06-28'
  sources:
    - Adobe Commerce plugin/interceptor docs

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

#### Agent Contract Fields

Use the agent contract fields to make a skill executable, not just informative:

- `use_when` and `do_not_use_when` define activation boundaries.
- `required_inputs` tells the agent what context to collect before editing.
- `workflow` is the minimal ordered path from discovery to implementation.
- `guardrails` captures risky actions; set `approval_required: true` for destructive, data-changing, or high-blast-radius operations.
- `verification` lists concrete proof expected before reporting completion.
- `output_contract` defines what the final answer must include.
- `freshness` records when domain assumptions were last reviewed and which sources should be re-checked for version-sensitive guidance.

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
