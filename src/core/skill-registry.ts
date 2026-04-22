import path from 'node:path';

import type { MageHubConfig } from '../types/config.js';
import type { Skill, SkillCategory } from '../types/skill.js';
import { loadConfig, resolveCustomSkillsPath } from './config-manager.js';
import {
  getGlobalSkillsDir,
  resolveGlobalCustomSkillsPath,
} from './global-config.js';
import { createMageHubPaths } from './paths.js';
import { resolveBundledSkillsPath } from './runtime-assets.js';
import {
  listSkillFiles,
  loadSkillsFromDirectories,
  type LoadedSkill,
} from './skill-loader.js';

export interface SkillRegistryEntry extends LoadedSkill {}

export class SkillRegistry {
  private readonly entries: SkillRegistryEntry[];

  public constructor(entries: SkillRegistryEntry[]) {
    const duplicate = entries
      .map((entry) => entry.skill.id)
      .find((skillId, index, allIds) => allIds.indexOf(skillId) !== index);

    if (duplicate !== undefined) {
      throw new Error(`Duplicate skill ID detected: ${duplicate}`);
    }

    this.entries = [...entries].sort((left, right) =>
      left.skill.id.localeCompare(right.skill.id),
    );
  }

  public list(category?: SkillCategory): Skill[] {
    return this.entries
      .filter((entry) =>
        category === undefined ? true : entry.skill.category === category,
      )
      .map((entry) => entry.skill);
  }

  public search(keyword: string, category?: SkillCategory): Skill[] {
    const normalized = keyword.toLowerCase();

    return this.entries
      .filter((entry) =>
        category === undefined ? true : entry.skill.category === category,
      )
      .map((entry) => entry.skill)
      .filter((skill) => {
        const haystack = [
          skill.id,
          skill.name,
          skill.description,
          ...(skill.tags ?? []),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalized);
      });
  }

  public getById(skillId: string): Skill | undefined {
    return this.entries.find((entry) => entry.skill.id === skillId)?.skill;
  }

  public getFilePath(skillId: string): string | undefined {
    return this.entries.find((entry) => entry.skill.id === skillId)?.filePath;
  }
}

export async function createSkillRegistry(
  rootDir: string,
  globalConfig?: MageHubConfig,
): Promise<SkillRegistry> {
  const paths = createMageHubPaths(rootDir);
  const localSkillFiles = await listSkillFiles(paths.skillsDir);
  const skillDirs =
    localSkillFiles.length > 0
      ? [paths.skillsDir]
      : [resolveBundledSkillsPath()];

  if (globalConfig !== undefined) {
    const globalCustomPath = resolveGlobalCustomSkillsPath(globalConfig);
    if (globalCustomPath !== undefined) {
      skillDirs.push(globalCustomPath);
    }
    const globalSkillsDir = getGlobalSkillsDir();
    const globalFiles = await listSkillFiles(globalSkillsDir).catch(() => []);
    if (globalFiles.length > 0 && !skillDirs.includes(globalSkillsDir)) {
      skillDirs.push(globalSkillsDir);
    }
  }

  const loadedConfig = await loadConfig(rootDir).catch(() => undefined);

  if (loadedConfig?.config.custom_skills_path !== undefined) {
    const customPath = resolveCustomSkillsPath(rootDir, loadedConfig.config);
    if (customPath !== undefined) {
      skillDirs.push(customPath);
    }
  }

  const entries = await loadSkillsFromDirectories(skillDirs);
  return new SkillRegistry(entries);
}

export function deriveSkillIdFromPath(filePath: string): string {
  return path.basename(path.dirname(filePath));
}
