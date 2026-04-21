import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

import YAML from 'yaml';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
  loadConfig,
  resolveCustomSkillsPath,
  saveConfig,
  validateConfigFile,
} from '../../src/core/config-manager.js';
import { resolveOutputTarget } from '../../src/core/formats.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import {
  createFixtureRepo,
  makeConfigYaml,
  makeSkillYaml,
} from '../helpers/fixture.js';

describe('config-manager', () => {
  let rootDir: string;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'module-test',
          yaml: makeSkillYaml({ id: 'module-test' }),
        },
      ],
      config: makeConfigYaml({ skills: ['module-test'], format: 'claude' }),
    });
  });

  describe('createDefaultConfig', () => {
    it('returns config with correct defaults', () => {
      const config = createDefaultConfig();

      expect(config.version).toBe('1');
      expect(config.skills).toEqual([]);
      expect(config.format).toBe('claude');
      expect(config.include_examples).toBe(true);
      expect(config.include_antipatterns).toBe(true);
    });
  });

  describe('resolveOutputTarget', () => {
    it('resolves claude output to a .claude/skills directory', () => {
      const target = resolveOutputTarget('/project', 'claude');
      expect(target.kind).toBe('directory');
      expect(target.path).toBe(path.join('/project', '.claude', 'skills'));
    });

    it('resolves opencode output to a .opencode/skills directory', () => {
      const target = resolveOutputTarget('/project', 'opencode');
      expect(target.kind).toBe('directory');
      expect(target.path).toBe(path.join('/project', '.opencode', 'skills'));
    });

    it('resolves trae output to a .trae/rules directory', () => {
      const target = resolveOutputTarget('/project', 'trae');
      expect(target.kind).toBe('directory');
      expect(target.path).toBe(path.join('/project', '.trae', 'rules'));
    });

    it('resolves codex output to a single AGENTS.md file', () => {
      const target = resolveOutputTarget('/project', 'codex');
      expect(target.kind).toBe('file');
      expect(target.path).toBe(path.join('/project', 'AGENTS.md'));
    });

    it('resolves cursor output to a single .cursorrules file', () => {
      const target = resolveOutputTarget('/project', 'cursor');
      expect(target.kind).toBe('file');
      expect(target.path).toBe(path.join('/project', '.cursorrules'));
    });

    it('resolves qoder output to a single .qoder/context.md file', () => {
      const target = resolveOutputTarget('/project', 'qoder');
      expect(target.kind).toBe('file');
      expect(target.path).toBe(path.join('/project', '.qoder', 'context.md'));
    });

    it('resolves markdown output to a single MAGEHUB.md file', () => {
      const target = resolveOutputTarget('/project', 'markdown');
      expect(target.kind).toBe('file');
      expect(target.path).toBe(path.join('/project', 'MAGEHUB.md'));
    });

    it('honors an absolute override for single-file formats', () => {
      const target = resolveOutputTarget(
        '/project',
        'codex',
        '/tmp/elsewhere.md',
      );
      expect(target.kind).toBe('file');
      expect(target.path).toBe('/tmp/elsewhere.md');
    });

    it('honors a relative override for per-skill formats', () => {
      const target = resolveOutputTarget('/project', 'claude', 'custom/skills');
      expect(target.kind).toBe('directory');
      expect(target.path).toBe(path.join('/project', 'custom', 'skills'));
    });
  });

  describe('loadConfig', () => {
    it('loads a valid config file', async () => {
      const result = await loadConfig(rootDir);

      expect(result.config.version).toBe('1');
      expect(result.config.skills).toEqual(['module-test']);
      expect(result.config.format).toBe('claude');
      expect(result.filePath).toBe(path.join(rootDir, '.magehub.yaml'));
    });

    it('throws when config file does not exist', async () => {
      const emptyRoot = await createFixtureRepo();

      await expect(loadConfig(emptyRoot)).rejects.toThrow();
    });

    it('throws on invalid config (missing required fields)', async () => {
      await writeFile(
        path.join(rootDir, '.magehub.yaml'),
        'format: claude\n',
        'utf8',
      );

      await expect(loadConfig(rootDir)).rejects.toThrow('Invalid config file');
    });

    it('throws on config with invalid format value', async () => {
      await writeFile(
        path.join(rootDir, '.magehub.yaml'),
        'version: "1"\nskills: []\nformat: invalid-format\n',
        'utf8',
      );

      await expect(loadConfig(rootDir)).rejects.toThrow('Invalid config file');
    });
  });

  describe('validateConfigFile', () => {
    it('validates a valid config', async () => {
      const result = await validateConfigFile(rootDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('reports errors for invalid config', async () => {
      await writeFile(
        path.join(rootDir, '.magehub.yaml'),
        'version: "1"\nskills: "not-an-array"\n',
        'utf8',
      );

      const result = await validateConfigFile(rootDir);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('saveConfig', () => {
    it('persists config to disk', async () => {
      const config = createDefaultConfig();
      config.skills = ['new-skill'];

      await saveConfig(rootDir, config);

      const content = await readFile(
        path.join(rootDir, '.magehub.yaml'),
        'utf8',
      );
      const parsed = YAML.parse(content) as { skills: string[] };
      expect(parsed.skills).toEqual(['new-skill']);
    });

    it('overwrites existing config', async () => {
      const config = createDefaultConfig();
      config.skills = ['a'];
      await saveConfig(rootDir, config);

      config.skills = ['b'];
      await saveConfig(rootDir, config);

      const result = await loadConfig(rootDir);
      expect(result.config.skills).toEqual(['b']);
    });
  });

  describe('resolveCustomSkillsPath', () => {
    it('resolves relative paths', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = './custom-skills';

      expect(resolveCustomSkillsPath(rootDir, config)).toBe(
        path.join(rootDir, 'custom-skills'),
      );
    });

    it('returns undefined for undefined path', () => {
      const config = createDefaultConfig();

      expect(resolveCustomSkillsPath(rootDir, config)).toBeUndefined();
    });

    it('returns undefined for empty string path', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '';

      expect(resolveCustomSkillsPath(rootDir, config)).toBeUndefined();
    });

    it('returns undefined for whitespace-only path', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '   ';

      expect(resolveCustomSkillsPath(rootDir, config)).toBeUndefined();
    });

    it('rejects paths outside project root', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '../outside';

      expect(() => resolveCustomSkillsPath(rootDir, config)).toThrow(
        'custom_skills_path must stay within the project root',
      );
    });

    it('rejects absolute paths outside project', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '/tmp/elsewhere';

      expect(() => resolveCustomSkillsPath(rootDir, config)).toThrow(
        'custom_skills_path must stay within the project root',
      );
    });
  });
});
