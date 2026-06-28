import { beforeEach, describe, expect, it } from 'vitest';

import {
  renderArtifact,
  renderPerSkillArtifact,
  renderSkillListTable,
  renderSkillSearchResults,
  renderSkillDetail,
  renderConfig,
  type PerSkillArtifact,
} from '../../src/core/renderer.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import type { OutputFormat } from '../../src/types/config.js';
import type { Skill } from '../../src/types/skill.js';
import { parseFrontMatter } from '../helpers/front-matter.js';

async function renderPerSkill(
  skills: Skill[],
  options: {
    format: OutputFormat;
    includeExamples: boolean;
    includeAntipatterns: boolean;
  },
): Promise<PerSkillArtifact> {
  const artifact = await renderArtifact(skills, options);
  if (artifact.kind !== 'per-skill-file') {
    throw new Error(`Expected per-skill artifact for ${options.format}`);
  }
  return artifact;
}

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    version: '1.0.0',
    category: 'module',
    description: 'A test skill',
    use_when: ['The task needs a test skill'],
    do_not_use_when: ['The task is unrelated'],
    required_inputs: ['Target class name'],
    instructions: '### Test\n\nDo something.',
    workflow: ['Inspect context', 'Apply the smallest useful change'],
    guardrails: [
      { rule: 'Do not edit unrelated files' },
      { rule: 'Ask before destructive commands', approval_required: true },
    ],
    verification: ['Run the focused test command'],
    output_contract: ['Report files changed and verification results'],
    conventions: [
      {
        rule: 'Be consistent',
        example: 'Follow local naming',
        rationale: 'Keeps generated code predictable',
      },
    ],
    examples: [{ title: 'Example', code: 'echo "hi"', language: 'bash' }],
    anti_patterns: [
      {
        pattern: 'Bad thing',
        problem: 'Causes issues',
        solution: 'Use the good thing',
      },
    ],
    files: [
      {
        path: 'Model/{{className}}.php',
        description: 'Generated model skeleton',
        template: '<?php\ndeclare(strict_types=1);',
      },
    ],
    references: [{ title: 'Docs', url: 'https://example.com' }],
    freshness: {
      last_reviewed: '2026-06-28',
      sources: ['Adobe Commerce 2.4.x docs'],
    },
    compatibility: ['claude'],
    ...overrides,
  };
}

describe('renderer', () => {
  beforeEach(() => {
    clearSchemaValidatorCache();
  });

  describe('renderSkillDetail', () => {
    it('renders name, id, version, category and description', () => {
      const output = renderSkillDetail(makeSkill());

      expect(output).toContain('Test Skill (test-skill) v1.0.0');
      expect(output).toContain('Category: module');
      expect(output).toContain('Description: A test skill');
    });

    it('renders tags when present', () => {
      const output = renderSkillDetail(
        makeSkill({ tags: ['plugin', 'interceptor'] }),
      );

      expect(output).toContain('Tags: plugin, interceptor');
    });

    it('renders conventions', () => {
      const output = renderSkillDetail(makeSkill());

      expect(output).toContain('Conventions:');
      expect(output).toContain('  - Be consistent');
      expect(output).toContain('Example: Follow local naming');
      expect(output).toContain('Rationale: Keeps generated code predictable');
    });

    it('renders agent contract summaries', () => {
      const output = renderSkillDetail(makeSkill());

      expect(output).toContain('Workflow (2):');
      expect(output).toContain('Guardrails (2):');
      expect(output).toContain('Ask before destructive commands');
      expect(output).toContain('Verification (1):');
      expect(output).toContain('File templates (1):');
    });

    it('renders examples as a summary list', () => {
      const output = renderSkillDetail(makeSkill());

      expect(output).toContain('Examples (1):');
      expect(output).toContain('  - Example');
    });

    it('renders anti-patterns with descriptions', () => {
      const output = renderSkillDetail(makeSkill());

      expect(output).toContain('Anti-patterns (1):');
      expect(output).toContain('  - Bad thing: Causes issues');
      expect(output).toContain('Solution: Use the good thing');
    });

    it('renders references', () => {
      const output = renderSkillDetail(makeSkill());

      expect(output).toContain('References:');
      expect(output).toContain('  - Docs: https://example.com');
    });

    it('omits optional sections when not present', () => {
      const minimal: Skill = {
        id: 'minimal',
        name: 'Minimal',
        version: '1.0.0',
        category: 'module',
        description: 'Minimal skill',
        instructions: '### Minimal\n\nJust instructions.',
      };

      const output = renderSkillDetail(minimal);

      expect(output).toContain('Minimal (minimal) v1.0.0');
      expect(output).not.toContain('Tags:');
      expect(output).not.toContain('Conventions:');
      expect(output).not.toContain('Examples');
      expect(output).not.toContain('Anti-patterns');
      expect(output).not.toContain('References:');
    });
  });

  describe('renderSkillListTable', () => {
    it('renders a formatted table with header', () => {
      const skills = [
        makeSkill({
          id: 'skill-a',
          version: '1.0.0',
          description: 'First skill',
        }),
        makeSkill({
          id: 'skill-b',
          version: '2.1.0',
          description: 'Second skill',
        }),
      ];

      const output = renderSkillListTable(skills);
      const lines = output.split('\n');

      expect(lines[0]).toContain('ID');
      expect(lines[0]).toContain('Version');
      expect(lines[0]).toContain('Description');
      expect(lines[1]).toContain('skill-a');
      expect(lines[1]).toContain('1.0.0');
      expect(lines[1]).toContain('First skill');
      expect(lines[2]).toContain('skill-b');
    });

    it('handles empty skill list', () => {
      const output = renderSkillListTable([]);
      const lines = output.split('\n');

      // Should still have header
      expect(lines[0]).toContain('ID');
      expect(lines).toHaveLength(1);
    });
  });

  describe('renderSkillSearchResults', () => {
    it('renders search results with keyword', () => {
      const skills = [
        makeSkill({ id: 'match-a', description: 'First match' }),
        makeSkill({ id: 'match-b', description: 'Second match' }),
      ];

      const output = renderSkillSearchResults(skills, 'match');

      expect(output).toContain('Search results for "match"');
      expect(output).toContain('match-a');
      expect(output).toContain('match-b');
      expect(output).toContain('Found 2 skills matching "match"');
    });

    it('uses singular form for single result', () => {
      const output = renderSkillSearchResults([makeSkill()], 'test');

      expect(output).toContain('Found 1 skill matching "test"');
    });
  });

  describe('renderConfig', () => {
    it('returns prettified JSON', () => {
      const config = {
        version: '1',
        skills: [{ id: 'a' }, { id: 'b' }],
        format: 'claude' as const,
      };

      const output = renderConfig(config);
      const parsed = JSON.parse(output) as {
        version: string;
        skills: Array<{ id: string }>;
      };

      expect(parsed.version).toBe('1');
      expect(parsed.skills).toEqual([{ id: 'a' }, { id: 'b' }]);
    });
  });

  describe('renderArtifact (per-skill-file)', () => {
    it('produces one file per skill with frontmatter and body', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files).toHaveLength(1);
      const file = artifact.files[0];
      expect(file.skillId).toBe('test-skill');
      expect(file.content).toContain('name: test-skill');
      expect(file.content).toContain('description: "A test skill"');
      expect(file.content).toContain('# Test Skill');
      expect(file.content).toContain('Do something.');
    });

    it('includes conventions in per-skill body', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files[0].content).toContain('### Conventions');
      expect(artifact.files[0].content).toContain('Be consistent');
      expect(artifact.files[0].content).toContain(
        'Example: Follow local naming',
      );
      expect(artifact.files[0].content).toContain(
        'Rationale: Keeps generated code predictable',
      );
    });

    it('includes the agent execution contract in per-skill body', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      const content = artifact.files[0].content;
      expect(content).toContain('### Activation');
      expect(content).toContain('#### Use When');
      expect(content).toContain('The task needs a test skill');
      expect(content).toContain('#### Do Not Use When');
      expect(content).toContain('### Workflow');
      expect(content).toContain('1. Inspect context');
      expect(content).toContain('### Guardrails');
      expect(content).toContain(
        'Ask before destructive commands (approval required)',
      );
      expect(content).toContain('### Verification');
      expect(content).toContain('Run the focused test command');
      expect(content).toContain('### Output Contract');
    });

    it('includes examples when enabled', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files[0].content).toContain('### Examples');
      expect(artifact.files[0].content).toContain('echo "hi"');
    });

    it('excludes examples when disabled', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: false,
        includeAntipatterns: true,
      });

      expect(artifact.files[0].content).not.toContain('### Examples');
    });

    it('excludes anti-patterns when disabled', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: false,
      });

      expect(artifact.files[0].content).not.toContain('### Anti-patterns');
    });

    it('includes anti-pattern solutions when enabled', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files[0].content).toContain(
        'Solution: Use the good thing',
      );
    });

    it('includes file templates and freshness metadata', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      const content = artifact.files[0].content;
      expect(content).toContain('### File Templates');
      expect(content).toContain('#### Model/<className>.php');
      expect(content).toContain('Model/{{className}}.php');
      expect(content).toContain('```php');
      expect(content).toContain('declare(strict_types=1);');
      expect(content).toContain('### Freshness');
      expect(content).toContain('Last reviewed: 2026-06-28');
    });

    it('includes references', async () => {
      const artifact = await renderPerSkill([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files[0].content).toContain('### References');
      expect(artifact.files[0].content).toContain(
        '[Docs](https://example.com)',
      );
    });

    it('emits separate files for each skill', async () => {
      const artifact = await renderPerSkill(
        [
          makeSkill({ id: 'first', name: 'First' }),
          makeSkill({ id: 'second', name: 'Second' }),
        ],
        {
          format: 'claude',
          includeExamples: true,
          includeAntipatterns: true,
        },
      );

      expect(artifact.files).toHaveLength(2);
      expect(artifact.files[0].skillId).toBe('first');
      expect(artifact.files[1].skillId).toBe('second');
      expect(artifact.files[0].content).toContain('# First');
      expect(artifact.files[1].content).toContain('# Second');
    });

    it('handles skills with no optional fields', async () => {
      const minimal: Skill = {
        id: 'minimal',
        name: 'Minimal',
        version: '1.0.0',
        category: 'module',
        description: 'Minimal skill',
        instructions: '### Minimal\n\nJust instructions.',
      };

      const artifact = await renderPerSkill([minimal], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });

      const content = artifact.files[0].content;
      expect(content).toContain('# Minimal');
      expect(content).not.toContain('### Conventions');
      expect(content).not.toContain('### Examples');
      expect(content).not.toContain('### Anti-patterns');
      expect(content).not.toContain('### File Templates');
      expect(content).not.toContain('### References');
    });

    it('renders qoder skill files with required frontmatter', async () => {
      const artifact = await renderPerSkillArtifact([makeSkill()], {
        format: 'qoder',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files).toHaveLength(1);
      expect(artifact.files[0].content).toContain('name: test-skill');
      expect(artifact.files[0].content).toContain(
        'description: "A test skill"',
      );
      expect(artifact.files[0].content).toContain('# Test Skill');
    });

    it('renders codex skill files with required frontmatter', async () => {
      const artifact = await renderPerSkillArtifact([makeSkill()], {
        format: 'codex',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.files).toHaveLength(1);
      expect(artifact.files[0].content).toContain('name: test-skill');
      expect(artifact.files[0].content).toContain(
        'description: "A test skill"',
      );
      expect(artifact.files[0].content).toContain('# Test Skill');
    });

    it('quotes YAML-sensitive descriptions in frontmatter', async () => {
      const description =
        "Run Magento 2 CLI commands through Warden's Docker environment: warden shell, bin/magento";
      const formats: OutputFormat[] = ['claude', 'opencode', 'codex', 'qoder'];

      for (const format of formats) {
        const artifact = await renderPerSkillArtifact(
          [makeSkill({ description })],
          {
            format,
            includeExamples: true,
            includeAntipatterns: true,
          },
        );
        const content = artifact.files[0].content;
        const { data } = parseFrontMatter(content);

        expect(content).toContain(
          `description: ${JSON.stringify(description)}`,
        );
        expect(data['description']).toBe(description);
      }
    });
  });

  describe('renderArtifact (per-skill-file)', () => {
    it('produces separate skill files for codex', async () => {
      const artifact = await renderArtifact(
        [
          makeSkill({ id: 'first', name: 'First' }),
          makeSkill({ id: 'second', name: 'Second' }),
        ],
        {
          format: 'codex',
          includeExamples: true,
          includeAntipatterns: true,
        },
      );

      expect(artifact.kind).toBe('per-skill-file');
      if (artifact.kind !== 'per-skill-file') return;
      expect(artifact.files).toHaveLength(2);
      expect(artifact.files[0].content).toContain('name: first');
      expect(artifact.files[1].content).toContain('name: second');
    });
  });
});
