import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import YAML from 'yaml';

import type { MageHubConfig, OutputFormat } from '../types/config.js';
import { ensureDirectory } from '../utils/fs.js';
import { resolveProjectRelativePath } from './runtime-assets.js';
import { validateConfigSchema } from './schema-validator.js';

const GLOBAL_DIR_NAME = '.magehub';
const GLOBAL_CONFIG_FILE = 'config.yaml';
const CODEX_HOME_DIR_NAME = '.codex';
const QODER_HOME_DIR_NAME = '.qoder';

function getGlobalDirSegments(): string[] {
  return [os.homedir(), GLOBAL_DIR_NAME];
}

export function getGlobalConfigDir(): string {
  return path.join(...getGlobalDirSegments());
}

export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), GLOBAL_CONFIG_FILE);
}

export function getGlobalSkillsDir(): string {
  return path.join(getGlobalConfigDir(), 'skills');
}

export function getCodexHomeDir(): string {
  const configured = process.env.CODEX_HOME?.trim();
  if (configured !== undefined && configured !== '') {
    return path.resolve(configured);
  }

  return path.join(os.homedir(), CODEX_HOME_DIR_NAME);
}

export function getQoderHomeDir(): string {
  const configured = process.env.QODER_HOME?.trim();
  if (configured !== undefined && configured !== '') {
    return path.resolve(configured);
  }

  return path.join(os.homedir(), QODER_HOME_DIR_NAME);
}

export function getQoderGlobalSkillsDir(): string {
  return path.join(getQoderHomeDir(), 'skills');
}

export function resolveGlobalOutputRoot(): string {
  return os.homedir();
}

export function createDefaultGlobalConfig(
  format: OutputFormat = 'claude',
): MageHubConfig {
  return {
    version: '1',
    skills: [],
    format,
    include_examples: true,
    include_antipatterns: true,
    custom_skills_path: 'skills',
  };
}

export async function loadGlobalConfig(): Promise<MageHubConfig | undefined> {
  const configPath = getGlobalConfigPath();
  const content = await readFile(configPath, 'utf8').catch((error: unknown) => {
    if (
      error instanceof Error &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }
    throw error;
  });

  if (content === undefined) {
    return undefined;
  }

  const parsed: unknown = YAML.parse(content);
  const validation = await validateConfigSchema(parsed);

  if (!validation.valid || validation.data === undefined) {
    throw new Error(
      `Invalid global config ${configPath}: ${validation.errors.join('; ')}`,
    );
  }

  return validation.data;
}

export async function saveGlobalConfig(config: MageHubConfig): Promise<void> {
  const configPath = getGlobalConfigPath();
  await ensureDirectory(path.dirname(configPath));
  await writeFile(configPath, YAML.stringify(config), 'utf8');
}

export function resolveGlobalCustomSkillsPath(
  config: MageHubConfig,
): string | undefined {
  if (
    config.custom_skills_path === undefined ||
    config.custom_skills_path.trim() === ''
  ) {
    return undefined;
  }

  return resolveProjectRelativePath(
    getGlobalConfigDir(),
    config.custom_skills_path,
  );
}
