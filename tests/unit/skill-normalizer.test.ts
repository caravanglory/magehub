import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { normalizeRawSkill } from '../../src/core/skill-normalizer.js';
import type { RawSkill } from '../../src/types/skill.js';
import { createFixtureRepo } from '../helpers/fixture.js';

function makeRawSkill(overrides: Partial<RawSkill> = {}): RawSkill {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    version: '1.0.0',
    category: 'module',
    description: 'A test skill',
    instructions: '### Test\n\nDo something.',
    ...overrides,
  };
}

describe('skill-normalizer', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await createFixtureRepo();
  });

  describe('normalizeRawSkill', () => {
    it('passes through inline instructions unchanged', async () => {
      const raw = makeRawSkill({ instructions: '### Inline\n\nContent.' });
      const skill = await normalizeRawSkill(raw, rootDir);

      expect(skill.instructions).toBe('### Inline\n\nContent.');
    });

    it('reads instructions from external file', async () => {
      const skillDir = path.join(rootDir, 'skills', 'module', 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        path.join(skillDir, 'instructions.md'),
        '### External\n\nLoaded from file.',
        'utf8',
      );

      const raw = makeRawSkill({
        instructions: undefined,
        instructions_file: 'instructions.md',
      });
      const skill = await normalizeRawSkill(raw, skillDir);

      expect(skill.instructions).toBe('### External\n\nLoaded from file.');
    });

    it('throws when instructions_file does not exist', async () => {
      const raw = makeRawSkill({
        instructions: undefined,
        instructions_file: 'missing.md',
      });

      await expect(normalizeRawSkill(raw, rootDir)).rejects.toThrow('ENOENT');
    });

    it('passes through inline example code unchanged', async () => {
      const raw = makeRawSkill({
        examples: [{ title: 'Ex', code: 'echo "hi"', language: 'bash' }],
      });
      const skill = await normalizeRawSkill(raw, rootDir);

      expect(skill.examples?.[0].code).toBe('echo "hi"');
    });

    it('reads example code from external file', async () => {
      const skillDir = path.join(rootDir, 'skills', 'module', 'test-skill');
      await mkdir(path.join(skillDir, 'examples'), { recursive: true });
      await writeFile(
        path.join(skillDir, 'examples', 'demo.php'),
        '<?php echo "hello";',
        'utf8',
      );

      const raw = makeRawSkill({
        examples: [
          { title: 'Demo', code_file: 'examples/demo.php', language: 'php' },
        ],
      });
      const skill = await normalizeRawSkill(raw, skillDir);

      expect(skill.examples?.[0].code).toBe('<?php echo "hello";');
      expect(skill.examples?.[0].language).toBe('php');
    });

    it('handles mix of inline and file-referenced examples', async () => {
      const skillDir = path.join(rootDir, 'skills', 'module', 'test-skill');
      await mkdir(path.join(skillDir, 'examples'), { recursive: true });
      await writeFile(
        path.join(skillDir, 'examples', 'external.php'),
        '<?php // external',
        'utf8',
      );

      const raw = makeRawSkill({
        examples: [
          { title: 'Inline', code: 'echo "inline"', language: 'bash' },
          {
            title: 'External',
            code_file: 'examples/external.php',
            language: 'php',
          },
        ],
      });
      const skill = await normalizeRawSkill(raw, skillDir);

      expect(skill.examples).toHaveLength(2);
      expect(skill.examples?.[0].code).toBe('echo "inline"');
      expect(skill.examples?.[1].code).toBe('<?php // external');
    });

    it('preserves all metadata fields', async () => {
      const raw = makeRawSkill({
        tags: ['a', 'b'],
        conventions: [{ rule: 'Be good' }],
        references: [{ title: 'Docs', url: 'https://example.com' }],
        compatibility: ['claude'],
      });
      const skill = await normalizeRawSkill(raw, rootDir);

      expect(skill.id).toBe('test-skill');
      expect(skill.tags).toEqual(['a', 'b']);
      expect(skill.conventions).toEqual([{ rule: 'Be good' }]);
      expect(skill.references).toEqual([
        { title: 'Docs', url: 'https://example.com' },
      ]);
    });

    it('does not include instructions_file in the normalized Skill', async () => {
      const raw = makeRawSkill({ instructions: '### Test\n\nContent.' });
      const skill = await normalizeRawSkill(raw, rootDir);

      expect(skill).not.toHaveProperty('instructions_file');
    });

    it('does not include code_file in normalized examples', async () => {
      const skillDir = path.join(rootDir, 'skills', 'module', 'test-skill');
      await mkdir(path.join(skillDir, 'examples'), { recursive: true });
      await writeFile(
        path.join(skillDir, 'examples', 'demo.php'),
        '<?php echo "hi";',
        'utf8',
      );

      const raw = makeRawSkill({
        examples: [
          { title: 'Demo', code_file: 'examples/demo.php', language: 'php' },
        ],
      });
      const skill = await normalizeRawSkill(raw, skillDir);

      expect(skill.examples?.[0]).not.toHaveProperty('code_file');
    });

    it('returns undefined examples when raw has no examples', async () => {
      const raw = makeRawSkill({ examples: undefined });
      const skill = await normalizeRawSkill(raw, rootDir);

      expect(skill.examples).toBeUndefined();
    });
  });
});
