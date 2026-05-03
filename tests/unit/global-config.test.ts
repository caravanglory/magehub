import { unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createDefaultGlobalConfig,
  getCodexHomeDir,
  getGlobalConfigDir,
  getGlobalConfigPath,
  getGlobalSkillsDir,
  getQoderGlobalSkillsDir,
  getQoderHomeDir,
  loadGlobalConfig,
  resolveGlobalOutputRoot,
  resolveGlobalCustomSkillsPath,
  saveGlobalConfig,
} from '../../src/core/global-config.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';

const globalConfigPath = getGlobalConfigPath();
let savedConfig: string | undefined;
let savedCodexHome: string | undefined;
let savedQoderHome: string | undefined;

async function backupGlobalConfig(): Promise<void> {
  try {
    savedConfig = await import('node:fs/promises').then((fs) =>
      fs.readFile(globalConfigPath, 'utf8'),
    );
    await unlink(globalConfigPath);
  } catch {
    savedConfig = undefined;
  }
}

async function restoreGlobalConfig(): Promise<void> {
  if (savedConfig !== undefined) {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(globalConfigPath, savedConfig, 'utf8');
  } else {
    try {
      await unlink(globalConfigPath);
    } catch {
      // already gone
    }
  }
}

describe('global-config', () => {
  beforeEach(async () => {
    clearSchemaValidatorCache();
    savedCodexHome = process.env.CODEX_HOME;
    savedQoderHome = process.env.QODER_HOME;
    await backupGlobalConfig();
  });

  afterEach(async () => {
    if (savedCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = savedCodexHome;
    }
    if (savedQoderHome === undefined) {
      delete process.env.QODER_HOME;
    } else {
      process.env.QODER_HOME = savedQoderHome;
    }
    await restoreGlobalConfig();
  });

  describe('getGlobalConfigDir', () => {
    it('returns ~/.magehub/', () => {
      const dir = getGlobalConfigDir();
      expect(dir).toBe(path.join(os.homedir(), '.magehub'));
    });
  });

  describe('getGlobalConfigPath', () => {
    it('returns ~/.magehub/config.yaml', () => {
      expect(getGlobalConfigPath()).toBe(
        path.join(os.homedir(), '.magehub', 'config.yaml'),
      );
    });
  });

  describe('getGlobalSkillsDir', () => {
    it('returns ~/.magehub/skills/', () => {
      expect(getGlobalSkillsDir()).toBe(
        path.join(os.homedir(), '.magehub', 'skills'),
      );
    });
  });

  describe('getCodexHomeDir', () => {
    it('returns ~/.codex when CODEX_HOME is not set', () => {
      delete process.env.CODEX_HOME;

      expect(getCodexHomeDir()).toBe(path.join(os.homedir(), '.codex'));
    });

    it('honors CODEX_HOME when set', () => {
      process.env.CODEX_HOME = 'custom-codex-home';

      expect(getCodexHomeDir()).toBe(path.resolve('custom-codex-home'));
    });
  });

  describe('getQoderHomeDir', () => {
    it('returns ~/.qoder when QODER_HOME is not set', () => {
      delete process.env.QODER_HOME;

      expect(getQoderHomeDir()).toBe(path.join(os.homedir(), '.qoder'));
    });

    it('honors QODER_HOME when set', () => {
      process.env.QODER_HOME = 'custom-qoder-home';

      expect(getQoderHomeDir()).toBe(path.resolve('custom-qoder-home'));
    });
  });

  describe('getQoderGlobalSkillsDir', () => {
    it('returns the Qoder user-level Skills directory', () => {
      process.env.QODER_HOME = '/tmp/magehub-qoder-home';

      expect(getQoderGlobalSkillsDir()).toBe(
        path.join('/tmp/magehub-qoder-home', 'skills'),
      );
    });
  });

  describe('resolveGlobalOutputRoot', () => {
    it('uses Codex home for global codex output', () => {
      process.env.CODEX_HOME = '/tmp/magehub-codex-home';

      expect(resolveGlobalOutputRoot('codex')).toBe('/tmp/magehub-codex-home');
    });

    it('uses the user home for non-codex global output', () => {
      process.env.CODEX_HOME = '/tmp/magehub-codex-home';

      expect(resolveGlobalOutputRoot('claude')).toBe(os.homedir());
    });
  });

  describe('createDefaultGlobalConfig', () => {
    it('returns config with custom_skills_path set to skills', () => {
      const config = createDefaultGlobalConfig();

      expect(config.version).toBe('1');
      expect(config.skills).toEqual([]);
      expect(config.format).toBe('claude');
      expect(config.custom_skills_path).toBe('skills');
      expect(config.include_examples).toBe(true);
      expect(config.include_antipatterns).toBe(true);
    });

    it('accepts a format override', () => {
      const config = createDefaultGlobalConfig('cursor');
      expect(config.format).toBe('cursor');
    });
  });

  describe('loadGlobalConfig', () => {
    it('returns undefined when no global config file exists', async () => {
      const config = await loadGlobalConfig();
      expect(config).toBeUndefined();
    });
  });

  describe('saveGlobalConfig + loadGlobalConfig', () => {
    it('round-trips a config through save and load', async () => {
      const config = createDefaultGlobalConfig();
      config.skills = ['test-skill'];

      await saveGlobalConfig(config);
      const loaded = await loadGlobalConfig();

      expect(loaded).toBeDefined();
      expect(loaded!.skills).toEqual(['test-skill']);
      expect(loaded!.format).toBe('claude');
      expect(loaded!.custom_skills_path).toBe('skills');
    });
  });

  describe('resolveGlobalCustomSkillsPath', () => {
    it('resolves relative paths against global config dir', () => {
      const config = createDefaultGlobalConfig();
      const resolved = resolveGlobalCustomSkillsPath(config);

      expect(resolved).toBe(path.join(os.homedir(), '.magehub', 'skills'));
    });

    it('returns undefined when custom_skills_path is not set', () => {
      const config = createDefaultGlobalConfig();
      delete config.custom_skills_path;

      expect(resolveGlobalCustomSkillsPath(config)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const config = createDefaultGlobalConfig();
      config.custom_skills_path = '';

      expect(resolveGlobalCustomSkillsPath(config)).toBeUndefined();
    });
  });
});
