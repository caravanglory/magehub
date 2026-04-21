import type { Command } from 'commander';

import { createSkillRegistry } from '../../core/skill-registry.js';
import { renderSkillSearchResults } from '../../core/renderer.js';
import { info } from '../../utils/logger.js';
import { parseSkillCategory } from '../../utils/validation.js';

export async function runSkillSearchCommand(
  keyword: string,
  options: { category?: string },
  rootDir?: string,
): Promise<void> {
  const registry = await createSkillRegistry(rootDir ?? process.cwd());
  const results = registry.search(
    keyword,
    parseSkillCategory(options.category),
  );

  if (results.length === 0) {
    info(`No skills matching "${keyword}".`);
    return;
  }

  console.log(renderSkillSearchResults(results, keyword));
}

export function registerSkillSearchCommand(program: Command): void {
  program
    .command('skill:search')
    .alias('search')
    .description('Search skills by keyword')
    .argument('<keyword>', 'Keyword to search')
    .option('--category <category>', 'Filter by category')
    .action(async (keyword: string, options: { category?: string }) =>
      runSkillSearchCommand(keyword, options),
    );
}
