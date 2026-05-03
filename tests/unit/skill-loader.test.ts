import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  listSkillFiles,
  parseSkillFile,
  loadSkillFile,
  loadAllSkills,
  loadSkillsFromDirectories,
} from '../../src/core/skill-loader.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import { createFixtureRepo, makeSkillYaml } from '../helpers/fixture.js';

describe('skill-loader', () => {
  let rootDir: string;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'module-alpha',
          yaml: makeSkillYaml({ id: 'module-alpha', name: 'Alpha' }),
        },
        {
          category: 'module',
          id: 'module-beta',
          yaml: makeSkillYaml({ id: 'module-beta', name: 'Beta' }),
        },
        {
          category: 'testing',
          id: 'testing-gamma',
          yaml: makeSkillYaml({
            id: 'testing-gamma',
            name: 'Gamma',
            category: 'testing',
          }),
        },
      ],
      config: 'version: "1"\nskills: []\n',
    });
  });

  describe('listSkillFiles', () => {
    it('finds all skill.yaml files in nested directories', async () => {
      const files = await listSkillFiles(path.join(rootDir, 'skills'));

      expect(files).toHaveLength(3);
      expect(files.every((f) => f.endsWith('skill.yaml'))).toBe(true);
    });

    it('returns sorted paths', async () => {
      const files = await listSkillFiles(path.join(rootDir, 'skills'));
      const basenames = files.map((f) => path.basename(path.dirname(f)));

      expect(basenames).toEqual([
        'module-alpha',
        'module-beta',
        'testing-gamma',
      ]);
    });

    it('returns empty array for missing directory', async () => {
      const files = await listSkillFiles(path.join(rootDir, 'nonexistent'));

      expect(files).toEqual([]);
    });

    it('returns empty array for empty directory', async () => {
      const emptyDir = path.join(rootDir, 'skills', 'empty-cat');
      await mkdir(emptyDir, { recursive: true });

      const files = await listSkillFiles(emptyDir);

      expect(files).toEqual([]);
    });
  });

  describe('parseSkillFile', () => {
    it('parses valid YAML and returns raw object', async () => {
      const filePath = path.join(
        rootDir,
        'skills',
        'module',
        'module-alpha',
        'skill.yaml',
      );
      const parsed = await parseSkillFile(filePath);

      expect(parsed).toBeDefined();
      expect((parsed as { id: string }).id).toBe('module-alpha');
    });

    it('throws on non-existent file', async () => {
      await expect(
        parseSkillFile(path.join(rootDir, 'nonexistent.yaml')),
      ).rejects.toThrow();
    });
  });

  describe('loadSkillFile', () => {
    it('loads and validates a valid skill', async () => {
      const filePath = path.join(
        rootDir,
        'skills',
        'module',
        'module-alpha',
        'skill.yaml',
      );
      const loaded = await loadSkillFile(filePath);

      expect(loaded.skill.id).toBe('module-alpha');
      expect(loaded.skill.name).toBe('Alpha');
      expect(loaded.filePath).toBe(filePath);
    });

    it('throws on invalid skill file', async () => {
      const invalidDir = path.join(
        rootDir,
        'skills',
        'module',
        'module-invalid',
      );
      await mkdir(invalidDir, { recursive: true });
      await writeFile(
        path.join(invalidDir, 'skill.yaml'),
        'id: invalid\nname: Missing Fields\n',
        'utf8',
      );

      await expect(
        loadSkillFile(path.join(invalidDir, 'skill.yaml')),
      ).rejects.toThrow('Invalid skill file');
    });

    it('loads skill with instructions_file reference', async () => {
      const skillDir = path.join(rootDir, 'skills', 'module', 'module-ext');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        path.join(skillDir, 'instructions.md'),
        '### External\n\nLoaded from file.',
        'utf8',
      );
      const yaml = [
        'id: module-ext',
        'name: External',
        'version: "1.0.0"',
        'category: module',
        'description: Skill with external instructions',
        'instructions_file: instructions.md',
      ].join('\n');
      await writeFile(path.join(skillDir, 'skill.yaml'), yaml, 'utf8');

      const loaded = await loadSkillFile(path.join(skillDir, 'skill.yaml'));

      expect(loaded.skill.instructions).toBe(
        '### External\n\nLoaded from file.',
      );
      expect(loaded.skill).not.toHaveProperty('instructions_file');
    });

    it('loads skill with code_file in examples', async () => {
      const skillDir = path.join(rootDir, 'skills', 'module', 'module-code');
      await mkdir(path.join(skillDir, 'examples'), { recursive: true });
      await writeFile(
        path.join(skillDir, 'examples', 'demo.php'),
        '<?php echo "hello";',
        'utf8',
      );
      const yaml = [
        'id: module-code',
        'name: CodeFile',
        'version: "1.0.0"',
        'category: module',
        'description: Skill with code file reference',
        'instructions: |',
        '  ### Test',
        '  Content.',
        'examples:',
        '  - title: Demo',
        '    code_file: examples/demo.php',
        '    language: php',
      ].join('\n');
      await writeFile(path.join(skillDir, 'skill.yaml'), yaml, 'utf8');

      const loaded = await loadSkillFile(path.join(skillDir, 'skill.yaml'));

      expect(loaded.skill.examples?.[0].code).toBe('<?php echo "hello";');
      expect(loaded.skill.examples?.[0]).not.toHaveProperty('code_file');
    });
  });

  describe('loadAllSkills', () => {
    it('loads all skills from a directory tree', async () => {
      const skills = await loadAllSkills(path.join(rootDir, 'skills'));

      expect(skills).toHaveLength(3);
      const ids = skills.map((s) => s.skill.id).sort();
      expect(ids).toEqual(['module-alpha', 'module-beta', 'testing-gamma']);
    });

    it('returns empty array for empty skills directory', async () => {
      const emptyRoot = await createFixtureRepo();
      const skills = await loadAllSkills(path.join(emptyRoot, 'skills'));

      expect(skills).toEqual([]);
    });
  });

  describe('loadSkillsFromDirectories', () => {
    it('loads from multiple directories', async () => {
      const secondRoot = await createFixtureRepo({
        skills: [
          {
            category: 'api',
            id: 'api-delta',
            yaml: makeSkillYaml({
              id: 'api-delta',
              name: 'Delta',
              category: 'api',
            }),
          },
        ],
      });

      const skills = await loadSkillsFromDirectories([
        path.join(rootDir, 'skills'),
        path.join(secondRoot, 'skills'),
      ]);

      expect(skills).toHaveLength(4);
    });

    it('returns empty for empty list of directories', async () => {
      const skills = await loadSkillsFromDirectories([]);

      expect(skills).toEqual([]);
    });
  });
});
