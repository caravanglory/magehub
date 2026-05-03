import type { Command } from 'commander';

import { loadConfig } from '../../core/config-manager.js';
import { loadGlobalConfig } from '../../core/global-config.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { validateSkillFile } from '../../core/skill-validator.js';
import { CliError } from '../../utils/cli-error.js';
import { info, warn } from '../../utils/logger.js';

export async function runSkillVerifyCommand(
  options: { all?: boolean; skill?: string },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const globalConfig = await loadGlobalConfig();
  const registry = await createSkillRegistry(effectiveRootDir, globalConfig);

  let skillIds: string[];

  if (options.skill !== undefined) {
    skillIds = [options.skill];
  } else if (options.all === true) {
    skillIds = registry.list().map((skill) => skill.id);
  } else {
    const loaded = await loadConfig(effectiveRootDir).catch(() => {
      throw new CliError(
        'Missing or invalid .magehub.yaml. Run `magehub setup:init` first.',
        2,
      );
    });
    skillIds = loaded.config.skills.map((e) => e.id);
  }

  if (skillIds.length === 0) {
    info('No skills selected for verification.');
    return;
  }

  const results = await Promise.all(
    skillIds.map(async (skillId) => {
      const filePath = registry.getFilePath(skillId);
      if (filePath === undefined) {
        throw new CliError(`Unknown skill ID: ${skillId}`, 3);
      }

      return validateSkillFile(filePath);
    }),
  );

  let warningCount = 0;
  for (const result of results) {
    if (!result.valid) {
      throw new CliError(
        `Skill validation failed for ${result.skillId ?? result.filePath}: ${result.errors.join('; ')}`,
        3,
      );
    }

    info(`✓ ${result.skillId ?? result.filePath} (schema OK)`);
    for (const warningMessage of result.warnings) {
      warningCount += 1;
      warn(`⚠ ${result.skillId ?? result.filePath}: ${warningMessage}`);
    }
  }

  info(
    `All skills verified${warningCount > 0 ? ` (${warningCount} warning${warningCount === 1 ? '' : 's'})` : ''}`,
  );
}

export function registerSkillVerifyCommand(program: Command): void {
  program
    .command('skill:verify')
    .alias('verify')
    .description('Verify skill YAML files against schema')
    .option('--all', 'Verify all skills available in the local registry')
    .option('--skill <skillId>', 'Verify a specific skill ID')
    .action(async (options: { all?: boolean; skill?: string }) =>
      runSkillVerifyCommand(options),
    );
}
