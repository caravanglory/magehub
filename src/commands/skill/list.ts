import type { Command } from 'commander';

import { loadGlobalConfig } from '../../core/global-config.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { renderSkillListTable } from '../../core/renderer.js';
import { info } from '../../utils/logger.js';
import { CliError } from '../../utils/cli-error.js';
import { parseSkillCategory } from '../../utils/validation.js';

export async function runSkillListCommand(
  options: { category?: string; format: string; global?: boolean },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const globalConfig = options.global ? undefined : await loadGlobalConfig();
  const registry = await createSkillRegistry(
    options.global
      ? (await import('../../core/global-config.js')).getGlobalConfigDir()
      : effectiveRootDir,
    options.global ? undefined : globalConfig,
  );
  const category = parseSkillCategory(options.category);
  const skills = registry.list(category);

  if (options.format === 'json') {
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  if (options.format !== 'table') {
    throw new CliError(`Unsupported list format: ${options.format}`, 1);
  }

  if (skills.length === 0) {
    info(
      category === undefined
        ? 'No skills available.'
        : `No skills available in category '${category}'.`,
    );
    return;
  }

  console.log(renderSkillListTable(skills));
  info(`Total: ${skills.length} skill${skills.length === 1 ? '' : 's'}`);
}

export function registerSkillListCommand(program: Command): void {
  program
    .command('skill:list')
    .alias('list')
    .description('List available skills')
    .option('--category <category>', 'Filter by category')
    .option('--format <format>', 'Output format: table or json', 'table')
    .option('-g, --global', 'List globally installed skills')
    .action(
      async (options: {
        category?: string;
        format: string;
        global?: boolean;
      }) => runSkillListCommand(options),
    );
}
