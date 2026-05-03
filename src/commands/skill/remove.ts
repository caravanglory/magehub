import type { Command } from 'commander';

import { rm } from 'node:fs/promises';

import {
  loadConfig,
  mergeConfigs,
  saveConfig,
} from '../../core/config-manager.js';
import { getFormatMetadata, resolveOutputTarget } from '../../core/formats.js';
import {
  getQoderGlobalSkillsDir,
  loadGlobalConfig,
  resolveGlobalOutputRoot,
  saveGlobalConfig,
} from '../../core/global-config.js';
import { renderArtifact } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import {
  removePerSkillFiles,
  removeSkillDirectories,
  writeArtifact,
} from '../../core/writer.js';
import { CliError } from '../../utils/cli-error.js';
import { pathExists } from '../../utils/fs.js';
import { info } from '../../utils/logger.js';

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

  const existing = new Set(config.skills);
  const missing = skillIds.filter((skillId) => !existing.has(skillId));
  if (missing.length > 0) {
    throw new CliError(
      `Skills not installed globally: ${missing.join(', ')}`,
      1,
    );
  }

  const format = config.format ?? 'claude';

  config.skills = config.skills.filter(
    (skillId) => !skillIds.includes(skillId),
  );
  await saveGlobalConfig(config);

  info('Updated ~/.magehub/config.yaml');
  for (const skillId of skillIds) {
    info(`✓ ${skillId}`);
  }

  if (options.write === false) {
    return;
  }

  if (format === 'qoder') {
    const removed = await removeSkillDirectories(
      getQoderGlobalSkillsDir(),
      skillIds,
    );
    for (const target of removed) {
      info(`Removed ${target}`);
    }
    return;
  }

  const outputRoot = resolveGlobalOutputRoot(format);
  const metadata = getFormatMetadata(format);

  if (config.skills.length === 0) {
    const target = resolveOutputTarget(outputRoot, format);
    if (target.kind === 'file' && (await pathExists(target.path))) {
      await rm(target.path);
      info(`Removed ${target.path}`);
    }
    return;
  }

  if (metadata.strategy === 'per-skill-file') {
    const removed = await removePerSkillFiles(
      outputRoot,
      format,
      undefined,
      skillIds,
    );
    for (const target of removed) {
      info(`Removed ${target}`);
    }
    return;
  }

  const globalConfigDir = (
    await import('../../core/global-config.js')
  ).getGlobalConfigDir();
  const registry = await createSkillRegistry(globalConfigDir, config);
  const remainingSkills = config.skills.map((skillId) => {
    const skill = registry.getById(skillId);
    if (skill === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
    return skill;
  });

  const artifact = await renderArtifact(remainingSkills, {
    format,
    includeExamples: config.include_examples ?? true,
    includeAntipatterns: config.include_antipatterns ?? true,
  });

  const result = await writeArtifact(outputRoot, format, undefined, artifact);
  info(`Regenerated: ${result.targetPath}`);
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

  const existing = new Set(loaded.config.skills);
  const missing = skillIds.filter((skillId) => !existing.has(skillId));
  if (missing.length > 0) {
    throw new CliError(`Skills not installed: ${missing.join(', ')}`, 1);
  }

  loaded.config.skills = loaded.config.skills.filter(
    (skillId) => !skillIds.includes(skillId),
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
  const removedSet = new Set(skillIds);
  const effectiveSkillIds = merged.skills.filter(
    (skillId) => !removedSet.has(skillId),
  );
  const format = merged.format ?? 'claude';
  const metadata = getFormatMetadata(format);

  if (metadata.strategy === 'per-skill-file') {
    const removed = await removePerSkillFiles(
      effectiveRootDir,
      format,
      merged.output,
      skillIds,
    );
    for (const target of removed) {
      info(`Removed ${target}`);
    }
    return;
  }

  const registry = await createSkillRegistry(effectiveRootDir, globalConfig);
  const remainingSkills = effectiveSkillIds.map((skillId) => {
    const skill = registry.getById(skillId);
    if (skill === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
    return skill;
  });

  if (remainingSkills.length === 0) {
    const target = resolveOutputTarget(effectiveRootDir, format, merged.output);
    if (target.kind === 'file' && (await pathExists(target.path))) {
      await rm(target.path);
      info(`Removed ${target.path}`);
    }
    return;
  }

  const artifact = await renderArtifact(remainingSkills, {
    format,
    includeExamples: merged.include_examples ?? true,
    includeAntipatterns: merged.include_antipatterns ?? true,
  });

  const result = await writeArtifact(
    effectiveRootDir,
    format,
    merged.output,
    artifact,
  );
  info(`Regenerated: ${result.targetPath}`);
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
