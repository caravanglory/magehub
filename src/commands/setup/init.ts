import type { Command } from 'commander';

import {
  createBootstrapConfig,
  loadConfig,
  saveConfig,
} from '../../core/config-manager.js';
import { resolveOutputTarget } from '../../core/formats.js';
import { ensureGitExcludeEntry } from '../../core/git-exclude.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';
import { parseOutputFormat } from '../../utils/validation.js';

export async function runSetupInitCommand(
  options: { format?: string; gitExclude?: boolean },
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

  if (options.gitExclude !== false) {
    const target = resolveOutputTarget(effectiveRootDir, config.format);
    const added = await ensureGitExcludeEntry(
      effectiveRootDir,
      target.path,
      target.kind,
    );
    if (added) {
      const relative = target.path.slice(effectiveRootDir.length + 1);
      info(
        `Updated .git/info/exclude with ${relative}${target.kind === 'directory' ? '/' : ''}`,
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
    .option('--no-git-exclude', 'Skip updating .git/info/exclude')
    .action(async (options: { format?: string; gitExclude?: boolean }) =>
      runSetupInitCommand(options),
    );
}
