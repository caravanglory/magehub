import type { Command } from 'commander';

import {
  loadConfig,
  mergeConfigs,
  saveConfig,
} from '../../core/config-manager.js';

import {
  loadGlobalConfig,
  resolveGlobalOutputRoot,
  saveGlobalConfig,
} from '../../core/global-config.js';
import { renderArtifact } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { removePerSkillFiles, writeArtifact } from '../../core/writer.js';
import type { SkillEntry } from '../../types/config.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';

function collectFormats(entries: SkillEntry[], fallback: string): Set<string> {
  return new Set(entries.map((e) => e.format ?? fallback));
}

async function runGlobalRemove(
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

  const existing = new Set(config.skills.map((e) => e.id));
  const missing = skillIds.filter((skillId) => !existing.has(skillId));
  if (missing.length > 0) {
    throw new CliError(
      `Skills not installed globally: ${missing.join(', ')}`,
      1,
    );
  }

  const format = config.format ?? 'claude';

  const removedEntries = config.skills.filter((e) => skillIds.includes(e.id));
  config.skills = config.skills.filter((e) => !skillIds.includes(e.id));
  await saveGlobalConfig(config);

  info('Updated ~/.magehub/config.yaml');
  for (const skillId of skillIds) {
    info(`✓ ${skillId}`);
  }

  if (options.write === false) {
    return;
  }

  const removedFormats = collectFormats(removedEntries, format);

  for (const fmt of removedFormats) {
    const outputRoot = resolveGlobalOutputRoot();

    const remainingInFormat = config.skills.filter(
      (e) => (e.format ?? format) === fmt,
    );

    const removed = await removePerSkillFiles(
      outputRoot,
      fmt,
      undefined,
      skillIds,
    );
    for (const target of removed) {
      info(`Removed ${target}`);
    }

    if (remainingInFormat.length === 0) {
      continue;
    }

    const globalConfigDir = (
      await import('../../core/global-config.js')
    ).getGlobalConfigDir();
    const registry = await createSkillRegistry(globalConfigDir, config);
    const remainingSkills = remainingInFormat.map((entry) => {
      const skill = registry.getById(entry.id);
      if (skill === undefined) {
        throw new CliError(`Unknown skill ID: ${entry.id}`, 3);
      }
      return skill;
    });

    const artifact = await renderArtifact(remainingSkills, {
      format: fmt,
      includeExamples: config.include_examples ?? true,
      includeAntipatterns: config.include_antipatterns ?? true,
    });

    const result = await writeArtifact(outputRoot, fmt, undefined, artifact);
    info(`Regenerated: ${result.targetPath}`);
  }
}

export async function runSkillRemoveCommand(
  skillIds: string[],
  options: { write?: boolean; global?: boolean },
  rootDir?: string,
): Promise<void> {
  if (options.global) {
    return runGlobalRemove(skillIds, options);
  }

  const effectiveRootDir = rootDir ?? process.cwd();
  const loaded = await loadConfig(effectiveRootDir).catch(() => {
    throw new CliError(
      'Missing or invalid .magehub.yaml. Run `magehub skill:install --current <id>` first.',
      2,
    );
  });

  if (skillIds.length === 0) {
    throw new CliError('No skills specified for removal.', 1);
  }

  const existing = new Set(loaded.config.skills.map((e) => e.id));
  const missing = skillIds.filter((skillId) => !existing.has(skillId));
  if (missing.length > 0) {
    throw new CliError(`Skills not installed: ${missing.join(', ')}`, 1);
  }

  const removedEntries = loaded.config.skills.filter((e) =>
    skillIds.includes(e.id),
  );
  loaded.config.skills = loaded.config.skills.filter(
    (e) => !skillIds.includes(e.id),
  );
  await saveConfig(effectiveRootDir, loaded.config);

  info('Updated .magehub.yaml');
  for (const skillId of skillIds) {
    info(`✓ ${skillId}`);
  }

  if (options.write === false) {
    return;
  }

  const globalConfig = await loadGlobalConfig();
  const merged = mergeConfigs(globalConfig, loaded.config);
  const fallbackFormat = merged.format ?? 'claude';
  const removedFormats = collectFormats(removedEntries, fallbackFormat);

  for (const fmt of removedFormats) {
    const remainingInFormat = merged.skills.filter(
      (e) => (e.format ?? fallbackFormat) === fmt,
    );

    const removed = await removePerSkillFiles(
      effectiveRootDir,
      fmt,
      merged.output,
      skillIds,
    );
    for (const target of removed) {
      info(`Removed ${target}`);
    }

    if (remainingInFormat.length === 0) {
      continue;
    }

    const registry = await createSkillRegistry(effectiveRootDir, globalConfig);
    const remainingSkills = remainingInFormat.map((entry) => {
      const skill = registry.getById(entry.id);
      if (skill === undefined) {
        throw new CliError(`Unknown skill ID: ${entry.id}`, 3);
      }
      return skill;
    });

    const artifact = await renderArtifact(remainingSkills, {
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
    info(`Regenerated: ${result.targetPath}`);
  }
}

export function registerSkillRemoveCommand(program: Command): void {
  program
    .command('skill:remove')
    .alias('remove')
    .description('Remove skills from .magehub.yaml and clean rendered files')
    .argument('<skillIds...>', 'Skill identifiers to remove')
    .option('-g, --global', 'Remove skill from global config')
    .option('--no-write', 'Skip removing rendered output files')
    .action(
      async (
        skillIds: string[],
        options: { write?: boolean; global?: boolean },
      ) => runSkillRemoveCommand(skillIds, options),
    );
}
