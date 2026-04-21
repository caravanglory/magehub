import { beforeEach, describe, expect, it } from 'vitest';

import {
  renderArtifact,
  renderSkillListTable,
  renderSkillSearchResults,
  renderSkillDetail,
  renderConfig,
  type PerSkillArtifact,
  type SingleFileArtifact,
} from '../../src/core/renderer.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import type { OutputFormat } from '../../src/types/config.js';
import type { Skill } from '../../src/types/skill.js';

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

async function renderSingle(
  skills: Skill[],
  options: {
    format: OutputFormat;
    includeExamples: boolean;
    includeAntipatterns: boolean;
  },
): Promise<SingleFileArtifact> {
  const artifact = await renderArtifact(skills, options);
  if (artifact.kind !== 'single-file') {
    throw new Error(`Expected single-file artifact for ${options.format}`);
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
    instructions: '### Test\n\nDo something.',
    conventions: [{ rule: 'Be consistent' }],
    examples: [{ title: 'Example', code: 'echo "hi"', language: 'bash' }],
    anti_patterns: [{ pattern: 'Bad thing', problem: 'Causes issues' }],
    references: [{ title: 'Docs', url: 'https://example.com' }],
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
        skills: ['a', 'b'],
        format: 'claude' as const,
      };

      const output = renderConfig(config);
      const parsed = JSON.parse(output) as {
        version: string;
        skills: string[];
      };

      expect(parsed.version).toBe('1');
      expect(parsed.skills).toEqual(['a', 'b']);
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
      expect(file.content).toContain('description: A test skill');
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
      expect(content).not.toContain('### References');
    });
  });

  describe('renderArtifact (single-file)', () => {
    it('concatenates skills into a single document for codex', async () => {
      const artifact = await renderSingle(
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

      expect(artifact.content).toContain('## First (first)');
      expect(artifact.content).toContain('## Second (second)');
      expect(artifact.content).toContain('---');
    });

    it('renders cursor format with enabled skills listing', async () => {
      const artifact = await renderSingle([makeSkill()], {
        format: 'cursor',
        includeExamples: true,
        includeAntipatterns: true,
      });

      expect(artifact.content).toContain('test-skill');
      expect(artifact.content).toContain('## Test Skill (test-skill)');
    });
  });
});
