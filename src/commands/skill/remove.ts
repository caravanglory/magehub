import type { Command } from 'commander';

import { rm } from 'node:fs/promises';

import { loadConfig, saveConfig } from '../../core/config-manager.js';
import { getFormatMetadata, resolveOutputTarget } from '../../core/formats.js';
import { renderArtifact } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { removePerSkillFiles, writeArtifact } from '../../core/writer.js';
import { CliError } from '../../utils/cli-error.js';
import { pathExists } from '../../utils/fs.js';
import { info } from '../../utils/logger.js';

export async function runSkillRemoveCommand(
  skillIds: string[],
  options: { write?: boolean },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const loaded = await loadConfig(effectiveRootDir).catch(() => {
    throw new CliError(
      'Missing or invalid .magehub.yaml. Run `magehub skill:install <id>` first.',
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

  const format = loaded.config.format ?? 'claude';
  const metadata = getFormatMetadata(format);

  if (metadata.strategy === 'per-skill-file') {
    const removed = await removePerSkillFiles(
      effectiveRootDir,
      format,
      loaded.config.output,
      skillIds,
    );
    for (const target of removed) {
      info(`Removed ${target}`);
    }
    return;
  }

  const registry = await createSkillRegistry(effectiveRootDir);
  const remainingSkills = loaded.config.skills.map((skillId) => {
    const skill = registry.getById(skillId);
    if (skill === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
    return skill;
  });

  if (remainingSkills.length === 0) {
    const target = resolveOutputTarget(
      effectiveRootDir,
      format,
      loaded.config.output,
    );
    if (target.kind === 'file' && (await pathExists(target.path))) {
      await rm(target.path);
      info(`Removed ${target.path}`);
    }
    return;
  }

  const artifact = await renderArtifact(remainingSkills, {
    format,
    includeExamples: loaded.config.include_examples ?? true,
    includeAntipatterns: loaded.config.include_antipatterns ?? true,
  });

  const result = await writeArtifact(
    effectiveRootDir,
    format,
    loaded.config.output,
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
    .option('--no-write', 'Skip removing rendered output files')
    .action(async (skillIds: string[], options: { write?: boolean }) =>
      runSkillRemoveCommand(skillIds, options),
    );
}
