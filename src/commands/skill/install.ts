import type { Command } from 'commander';

import {
  createBootstrapConfig,
  loadConfig,
  saveConfig,
} from '../../core/config-manager.js';
import { ensureGitignoreEntry } from '../../core/gitignore.js';
import { resolveOutputTarget } from '../../core/formats.js';
import { renderArtifact } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { writeArtifact } from '../../core/writer.js';
import type { MageHubConfig } from '../../types/config.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';
import {
  parseOutputFormat,
  parseSkillCategory,
} from '../../utils/validation.js';

function mergeUnique(existing: string[], additions: string[]): string[] {
  return [...new Set([...existing, ...additions])];
}

async function loadOrBootstrapConfig(
  rootDir: string,
  formatOverride?: string,
): Promise<{ config: MageHubConfig; bootstrapped: boolean }> {
  const loaded = await loadConfig(rootDir).catch((error: unknown) => {
    if (
      error instanceof Error &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }
    throw error;
  });

  if (loaded !== undefined) {
    if (formatOverride !== undefined) {
      loaded.config.format = parseOutputFormat(
        formatOverride,
        loaded.config.format ?? 'claude',
      );
    }
    return { config: loaded.config, bootstrapped: false };
  }

  const bootstrap = await createBootstrapConfig(rootDir);
  if (formatOverride !== undefined) {
    bootstrap.format = parseOutputFormat(
      formatOverride,
      bootstrap.format ?? 'claude',
    );
  }
  return { config: bootstrap, bootstrapped: true };
}

export async function runSkillInstallCommand(
  skillIds: string[],
  options: {
    category?: string;
    format?: string;
    write?: boolean;
    gitignore?: boolean;
  },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const registry = await createSkillRegistry(effectiveRootDir);

  const { config, bootstrapped } = await loadOrBootstrapConfig(
    effectiveRootDir,
    options.format,
  );

  const parsedCategory = parseSkillCategory(options.category);
  const categorySkillIds =
    parsedCategory !== undefined
      ? registry.list(parsedCategory).map((skill) => skill.id)
      : [];
  const targetIds = mergeUnique(skillIds, categorySkillIds);

  if (targetIds.length === 0) {
    throw new CliError('No skills specified for installation.', 1);
  }

  for (const skillId of targetIds) {
    if (registry.getById(skillId) === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
  }

  const previous = new Set(config.skills);
  config.skills = mergeUnique(config.skills, targetIds);
  await saveConfig(effectiveRootDir, config);

  if (bootstrapped) {
    info('Created .magehub.yaml');
  } else {
    info('Updated .magehub.yaml');
  }

  for (const skillId of targetIds) {
    info(`${previous.has(skillId) ? '•' : '✓'} ${skillId}`);
  }

  if (options.write === false) {
    return;
  }

  const format = config.format ?? 'claude';
  const targetSkills = config.skills.map((skillId) => {
    const skill = registry.getById(skillId);
    if (skill === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
    return skill;
  });

  const artifact = await renderArtifact(targetSkills, {
    format,
    includeExamples: config.include_examples ?? true,
    includeAntipatterns: config.include_antipatterns ?? true,
  });

  const result = await writeArtifact(
    effectiveRootDir,
    format,
    config.output,
    artifact,
  );

  if (result.targetKind === 'file') {
    info(`Generated: ${result.targetPath}`);
  } else {
    info(
      `Generated ${result.written.length} skill file(s) under ${result.targetPath}`,
    );
  }

  if (options.gitignore !== false) {
    const target = resolveOutputTarget(effectiveRootDir, format, config.output);
    const added = await ensureGitignoreEntry(
      effectiveRootDir,
      target.path,
      target.kind,
    );
    if (added) {
      const relative = result.targetPath.slice(effectiveRootDir.length + 1);
      info(
        `Updated .gitignore with ${relative}${result.targetKind === 'directory' ? '/' : ''}`,
      );
    }
  }
}

export function registerSkillInstallCommand(program: Command): void {
  program
    .command('skill:install')
    .alias('install')
    .description('Install skills into .magehub.yaml and render output files')
    .argument('[skillIds...]', 'Skill identifiers to install')
    .option('--category <category>', 'Install all skills from a category')
    .option('--format <format>', 'Override output format (persisted to config)')
    .option('--no-write', 'Skip writing rendered output files')
    .option('--no-gitignore', 'Skip updating .gitignore')
    .action(
      async (
        skillIds: string[],
        options: {
          category?: string;
          format?: string;
          write?: boolean;
          gitignore?: boolean;
        },
      ) => runSkillInstallCommand(skillIds, options),
    );
}
