import { readFile, writeFile } from 'node:fs/promises';

import YAML from 'yaml';

import type {
  MageHubConfig,
  OutputFormat,
  SkillEntry,
} from '../types/config.js';
import { detectFormat } from './formats.js';
import { createMageHubPaths } from './paths.js';
import {
  isPathInsideProject,
  resolveProjectRelativePath,
} from './runtime-assets.js';
import { validateConfigSchema } from './schema-validator.js';

export interface ConfigLoadResult {
  config: MageHubConfig;
  filePath: string;
}

export function createDefaultConfig(
  format: OutputFormat = 'claude',
): MageHubConfig {
  return {
    version: '1',
    skills: [],
    format,
    include_examples: true,
    include_antipatterns: true,
  };
}

export async function createBootstrapConfig(
  rootDir: string,
): Promise<MageHubConfig> {
  const format = await detectFormat(rootDir);
  return createDefaultConfig(format);
}

export async function loadConfig(rootDir: string): Promise<ConfigLoadResult> {
  const { configFile } = createMageHubPaths(rootDir);
  const content = await readFile(configFile, 'utf8');
  const parsed: unknown = YAML.parse(content);
  const validation = await validateConfigSchema(parsed);

  if (!validation.valid || validation.data === undefined) {
    throw new Error(
      `Invalid config file ${configFile}: ${validation.errors.join('; ')}`,
    );
  }

  return {
    config: validation.data,
    filePath: configFile,
  };
}

export async function validateConfigFile(
  rootDir: string,
): Promise<{ filePath: string; errors: string[]; valid: boolean }> {
  const { configFile } = createMageHubPaths(rootDir);
  const content = await readFile(configFile, 'utf8');
  const parsed: unknown = YAML.parse(content);
  const validation = await validateConfigSchema(parsed);

  return {
    filePath: configFile,
    valid: validation.valid,
    errors: validation.errors,
  };
}

export async function saveConfig(
  rootDir: string,
  config: MageHubConfig,
): Promise<void> {
  const { configFile } = createMageHubPaths(rootDir);
  await writeFile(configFile, YAML.stringify(config), 'utf8');
}

export function resolveCustomSkillsPath(
  rootDir: string,
  config: MageHubConfig,
): string | undefined {
  if (
    config.custom_skills_path === undefined ||
    config.custom_skills_path.trim() === ''
  ) {
    return undefined;
  }

  const resolved = resolveProjectRelativePath(
    rootDir,
    config.custom_skills_path,
  );
  if (!isPathInsideProject(rootDir, resolved)) {
    throw new Error('custom_skills_path must stay within the project root');
  }

  return resolved;
}

export function mergeSkillEntries(
  primary: SkillEntry[],
  secondary: SkillEntry[],
): SkillEntry[] {
  const seen = new Set(primary.map((entry) => entry.id));
  return [...primary, ...secondary.filter((entry) => !seen.has(entry.id))];
}

export function mergeConfigs(
  global: MageHubConfig | undefined,
  project: MageHubConfig,
): MageHubConfig {
  if (global === undefined) {
    return project;
  }

  const merged: MageHubConfig = {
    version: project.version,
    skills: mergeSkillEntries(project.skills, global.skills),
    format: project.format ?? global.format,
    output: project.output ?? global.output,
    include_examples: project.include_examples ?? global.include_examples,
    include_antipatterns:
      project.include_antipatterns ?? global.include_antipatterns,
    custom_skills_path: project.custom_skills_path,
  };

  if (project.registries || global.registries) {
    const allRegistries = [
      ...(project.registries ?? []),
      ...(global.registries ?? []),
    ];
    const seen = new Set<string>();
    merged.registries = allRegistries.filter((reg) => {
      const key = `${reg.name}:${reg.url}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  if (project.allowlist || global.allowlist) {
    merged.allowlist = [
      ...new Set([...(project.allowlist ?? []), ...(global.allowlist ?? [])]),
    ];
  }

  return merged;
}
