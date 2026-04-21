import type { Command } from 'commander';

import {
  createBootstrapConfig,
  loadConfig,
  saveConfig,
} from '../../core/config-manager.js';
import { resolveOutputTarget } from '../../core/formats.js';
import { ensureGitignoreEntry } from '../../core/gitignore.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';
import { parseOutputFormat } from '../../utils/validation.js';

export async function runSetupInitCommand(
  options: { format?: string; gitignore?: boolean },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();

  const existing = await loadConfig(effectiveRootDir).catch(
    (error: unknown) => {
      if (
        error instanceof Error &&
        'code' in error &&
        typeof error.code === 'string' &&
        error.code === 'ENOENT'
      ) {
        return undefined;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Unknown config loading error');
    },
  );

  if (existing !== undefined) {
    throw new CliError('.magehub.yaml already exists', 2);
  }

  const config = await createBootstrapConfig(effectiveRootDir);
  config.format = parseOutputFormat(options.format, config.format ?? 'claude');

  await saveConfig(effectiveRootDir, config);
  info('Created .magehub.yaml');

  if (options.gitignore !== false) {
    const target = resolveOutputTarget(effectiveRootDir, config.format);
    const added = await ensureGitignoreEntry(
      effectiveRootDir,
      target.path,
      target.kind,
    );
    if (added) {
      const relative = target.path.slice(effectiveRootDir.length + 1);
      info(
        `Updated .gitignore with ${relative}${target.kind === 'directory' ? '/' : ''}`,
      );
    }
  }

  info('MageHub initialized. Run `magehub skill:install <id>` to add skills.');
}

export function registerSetupInitCommand(program: Command): void {
  program
    .command('setup:init')
    .alias('init')
    .description(
      'Initialize MageHub in the current project (optional — skill:install auto-bootstraps)',
    )
    .option('--format <format>', 'Default output format')
    .option('--no-gitignore', 'Skip updating .gitignore')
    .action(async (options: { format?: string; gitignore?: boolean }) =>
      runSetupInitCommand(options),
    );
}
