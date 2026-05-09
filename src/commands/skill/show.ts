import type { Command } from 'commander';

import { loadGlobalConfig } from '../../core/global-config.js';
import { renderSkillDetail } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { printSkillUpgradeHint } from '../../core/upgrade-checker.js';
import { CliError } from '../../utils/cli-error.js';

export async function runSkillShowCommand(
  skillId: string,
  rootDir?: string,
): Promise<void> {
  const globalConfig = await loadGlobalConfig();
  const registry = await createSkillRegistry(
    rootDir ?? process.cwd(),
    globalConfig,
  );
  const skill = registry.getById(skillId);

  if (skill === undefined) {
    throw new CliError(`Unknown skill ID: ${skillId}`, 3);
  }

  console.log(renderSkillDetail(skill));

  if (globalConfig !== undefined) {
    void printSkillUpgradeHint(globalConfig, skillId, (id) =>
      registry.getById(id),
    );
  }
}

export function registerSkillShowCommand(program: Command): void {
  program
    .command('skill:show')
    .alias('show')
    .description('Show detailed skill information')
    .argument('<skillId>', 'Skill identifier')
    .action(async (skillId: string) => runSkillShowCommand(skillId));
}
