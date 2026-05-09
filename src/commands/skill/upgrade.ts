import type { Command } from 'commander';

import {
  loadConfig,
  mergeConfigs,
  saveConfig,
} from '../../core/config-manager.js';
import {
  getGlobalConfigDir,
  loadGlobalConfig,
  resolveGlobalOutputRoot,
  saveGlobalConfig,
} from '../../core/global-config.js';
import { renderArtifact } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { findOutdatedSkills } from '../../core/upgrade-checker.js';
import { writeArtifact } from '../../core/writer.js';
import type { MageHubConfig, SkillEntry } from '../../types/config.js';
import type { Skill } from '../../types/skill.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';

function groupSkillsByFormat(
  entries: SkillEntry[],
  getSkill: (id: string) => Skill | undefined,
  fallbackFormat: string,
): Map<string, Skill[]> {
  const groups = new Map<string, Skill[]>();
  for (const entry of entries) {
    const fmt = entry.format ?? fallbackFormat;
    let group = groups.get(fmt);
    if (group === undefined) {
      group = [];
      groups.set(fmt, group);
    }
    const skill = getSkill(entry.id);
    if (skill !== undefined) {
      group.push(skill);
    }
  }
  return groups;
}

function applyUpgrades(
  config: MageHubConfig,
  targetIds: Set<string>,
  getSkill: (id: string) => Skill | undefined,
): string[] {
  const upgraded: string[] = [];

  for (const entry of config.skills) {
    if (!targetIds.has(entry.id)) {
      continue;
    }
    const skill = getSkill(entry.id);
    if (skill === undefined) {
      continue;
    }
    const previous = entry.installed_version ?? 'unknown';
    if (previous === skill.version) {
      continue;
    }
    entry.installed_version = skill.version;
    upgraded.push(`${entry.id} ${previous} → ${skill.version}`);
  }

  return upgraded;
}

async function runGlobalUpgrade(
  skillIds: string[],
  options: { write?: boolean },
): Promise<void> {
  const config = await loadGlobalConfig();
  if (config === undefined) {
    throw new CliError(
      'No global config found. Run `magehub skill:install <id>` first.',
      2,
    );
  }

  const globalConfigDir = getGlobalConfigDir();
  const registry = await createSkillRegistry(globalConfigDir, config);
  const getSkill = (id: string) => registry.getById(id);

  const outdated = findOutdatedSkills(config.skills, getSkill);
  if (outdated.length === 0) {
    info('All globally installed skills are up to date.');
    return;
  }

  const targetIds =
    skillIds.length > 0
      ? new Set(skillIds)
      : new Set(outdated.map((s) => s.id));

  const upgraded = applyUpgrades(config, targetIds, getSkill);

  if (upgraded.length === 0) {
    info('No matching skills need upgrading.');
    return;
  }

  await saveGlobalConfig(config);

  for (const line of upgraded) {
    info(`✓ ${line}`);
  }

  if (options.write === false) {
    return;
  }

  const format = config.format ?? 'claude';
  const grouped = groupSkillsByFormat(config.skills, getSkill, format);

  for (const [fmt, skills] of grouped) {
    const artifact = await renderArtifact(skills, {
      format: fmt,
      includeExamples: config.include_examples ?? true,
      includeAntipatterns: config.include_antipatterns ?? true,
    });

    const outputRoot = resolveGlobalOutputRoot();
    const result = await writeArtifact(outputRoot, fmt, undefined, artifact);
    info(
      `Regenerated ${result.written.length} skill file(s) under ${result.targetPath}`,
    );
  }
}

export async function runSkillUpgradeCommand(
  skillIds: string[],
  options: {
    write?: boolean;
    global?: boolean;
    current?: boolean;
  },
  rootDir?: string,
): Promise<void> {
  if (options.global && options.current) {
    throw new CliError('Cannot combine --global and --current.', 1);
  }

  if (!options.current) {
    return runGlobalUpgrade(skillIds, options);
  }

  const effectiveRootDir = rootDir ?? process.cwd();
  const globalConfig = await loadGlobalConfig();
  const registry = await createSkillRegistry(effectiveRootDir, globalConfig);
  const getSkill = (id: string) => registry.getById(id);

  const loaded = await loadConfig(effectiveRootDir).catch(() => {
    throw new CliError(
      'Missing or invalid .magehub.yaml. Run `magehub skill:install --current <id>` first.',
      2,
    );
  });

  const outdated = findOutdatedSkills(loaded.config.skills, getSkill);
  if (outdated.length === 0) {
    info('All installed skills are up to date.');
    return;
  }

  const targetIds =
    skillIds.length > 0
      ? new Set(skillIds)
      : new Set(outdated.map((s) => s.id));

  const upgraded = applyUpgrades(loaded.config, targetIds, getSkill);

  if (upgraded.length === 0) {
    info('No matching skills need upgrading.');
    return;
  }

  await saveConfig(effectiveRootDir, loaded.config);

  for (const line of upgraded) {
    info(`✓ ${line}`);
  }

  if (options.write === false) {
    return;
  }

  const merged = mergeConfigs(globalConfig, loaded.config);
  const fallbackFormat = merged.format ?? 'claude';
  const grouped = groupSkillsByFormat(merged.skills, getSkill, fallbackFormat);

  for (const [fmt, skills] of grouped) {
    const artifact = await renderArtifact(skills, {
      format: fmt,
      includeExamples: merged.include_examples ?? true,
      includeAntipatterns: merged.include_antipatterns ?? true,
    });

    const result = await writeArtifact(
      effectiveRootDir,
      fmt,
      merged.output,
      artifact,
    );

    if (result.targetKind === 'file') {
      info(`Regenerated: ${result.targetPath}`);
    } else {
      info(
        `Regenerated ${result.written.length} skill file(s) under ${result.targetPath}`,
      );
    }
  }
}

export function registerSkillUpgradeCommand(program: Command): void {
  program
    .command('skill:upgrade')
    .alias('upgrade')
    .description('Upgrade installed skills to the latest available versions')
    .argument('[skillIds...]', 'Skill identifiers to upgrade (default: all)')
    .option('-g, --global', 'Upgrade globally installed skills (default)')
    .option(
      '-c, --current',
      'Upgrade skills in the current project .magehub.yaml',
    )
    .option('--no-write', 'Skip re-rendering output files')
    .action(
      async (
        skillIds: string[],
        options: {
          write?: boolean;
          global?: boolean;
          current?: boolean;
        },
      ) => runSkillUpgradeCommand(skillIds, options),
    );
}
