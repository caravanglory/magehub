import type { Command } from 'commander';

import {
  createBootstrapConfig,
  loadConfig,
  mergeConfigs,
  saveConfig,
} from '../../core/config-manager.js';
import { ensureGitExcludeEntry } from '../../core/git-exclude.js';
import { resolveOutputTarget } from '../../core/formats.js';
import {
  createDefaultGlobalConfig,
  getGlobalConfigDir,
  loadGlobalConfig,
  resolveGlobalOutputRoot,
  saveGlobalConfig,
} from '../../core/global-config.js';
import { renderArtifact } from '../../core/renderer.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { writeArtifact } from '../../core/writer.js';
import type { MageHubConfig, SkillEntry } from '../../types/config.js';
import type { Skill } from '../../types/skill.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';
import {
  parseOutputFormat,
  parseSkillCategory,
} from '../../utils/validation.js';

function mergeUnique(
  existing: SkillEntry[],
  additions: string[],
  format: string,
  getVersion: (id: string) => string | undefined,
): SkillEntry[] {
  const seen = new Set(existing.map((e) => e.id));
  const newEntries: SkillEntry[] = additions
    .filter((id) => !seen.has(id))
    .map((id) => ({
      id,
      format: format as SkillEntry['format'],
      installed_version: getVersion(id),
    }));
  return [...existing, ...newEntries];
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
    loaded.config.format = parseOutputFormat(formatOverride, 'claude');
    return { config: loaded.config, bootstrapped: false };
  }

  const bootstrap = await createBootstrapConfig(rootDir);
  bootstrap.format = parseOutputFormat(formatOverride, 'claude');
  return { config: bootstrap, bootstrapped: true };
}

function groupSkillsByFormat(
  entries: SkillEntry[],
  registry: { getById: (id: string) => Skill | undefined },
  fallbackFormat: string,
): Map<string, Skill[]> {
  const groups = new Map<string, Skill[]>();
  for (const entry of entries) {
    const fmt = entry.format ?? fallbackFormat;
    let group = groups.get(fmt);
    if (group === undefined) {
      group = [];
      groups.set(fmt, group);
    }
    const skill = registry.getById(entry.id);
    if (skill !== undefined) {
      group.push(skill);
    }
  }
  return groups;
}

async function runGlobalInstall(
  skillIds: string[],
  options: {
    category?: string;
    format?: string;
    write?: boolean;
  },
): Promise<void> {
  const globalConfigDir = getGlobalConfigDir();

  let config = await loadGlobalConfig();
  const format = parseOutputFormat(options.format, 'claude');
  const isNew = config === undefined;
  if (isNew) {
    config = createDefaultGlobalConfig(format);
  } else {
    config.format = format;
  }

  const registry = await createSkillRegistry(globalConfigDir, config);

  const parsedCategory = parseSkillCategory(options.category);
  const categorySkillIds =
    parsedCategory !== undefined
      ? registry.list(parsedCategory).map((skill) => skill.id)
      : [];
  const allTargetIds = [...new Set([...skillIds, ...categorySkillIds])];

  if (allTargetIds.length === 0) {
    throw new CliError('No skills specified for installation.', 1);
  }

  for (const skillId of allTargetIds) {
    if (registry.getById(skillId) === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
  }

  const previous = new Set(config.skills.map((e) => e.id));
  config.skills = mergeUnique(
    config.skills,
    allTargetIds,
    format,
    (id) => registry.getById(id)?.version,
  );
  await saveGlobalConfig(config);

  if (isNew) {
    info('Created ~/.magehub/config.yaml');
  } else {
    info('Updated ~/.magehub/config.yaml');
  }

  for (const skillId of allTargetIds) {
    info(`${previous.has(skillId) ? '•' : '✓'} ${skillId}`);
  }

  if (options.write === false) {
    return;
  }

  const grouped = groupSkillsByFormat(config.skills, registry, format);

  for (const [fmt, skills] of grouped) {
    const artifact = await renderArtifact(skills, {
      format: fmt,
      includeExamples: config.include_examples ?? true,
      includeAntipatterns: config.include_antipatterns ?? true,
    });

    const outputRoot = resolveGlobalOutputRoot();
    const result = await writeArtifact(outputRoot, fmt, undefined, artifact);

    info(
      `Generated ${result.written.length} skill file(s) under ${result.targetPath}`,
    );
  }
}

export async function runSkillInstallCommand(
  skillIds: string[],
  options: {
    category?: string;
    format?: string;
    write?: boolean;
    gitExclude?: boolean;
    global?: boolean;
    current?: boolean;
  },
  rootDir?: string,
): Promise<void> {
  if (options.global && options.current) {
    throw new CliError('Cannot combine --global and --current.', 1);
  }

  if (!options.current) {
    return runGlobalInstall(skillIds, options);
  }

  const effectiveRootDir = rootDir ?? process.cwd();
  const globalConfig = await loadGlobalConfig();
  const registry = await createSkillRegistry(effectiveRootDir, globalConfig);

  const { config, bootstrapped } = await loadOrBootstrapConfig(
    effectiveRootDir,
    options.format,
  );

  const parsedCategory = parseSkillCategory(options.category);
  const categorySkillIds =
    parsedCategory !== undefined
      ? registry.list(parsedCategory).map((skill) => skill.id)
      : [];
  const allTargetIds = [...new Set([...skillIds, ...categorySkillIds])];

  if (allTargetIds.length === 0) {
    throw new CliError('No skills specified for installation.', 1);
  }

  for (const skillId of allTargetIds) {
    if (registry.getById(skillId) === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
  }

  const format = parseOutputFormat(options.format, 'claude');
  const previous = new Set(config.skills.map((e) => e.id));
  config.skills = mergeUnique(
    config.skills,
    allTargetIds,
    format,
    (id) => registry.getById(id)?.version,
  );
  await saveConfig(effectiveRootDir, config);

  if (bootstrapped) {
    info('Created .magehub.yaml');
  } else {
    info('Updated .magehub.yaml');
  }

  for (const skillId of allTargetIds) {
    info(`${previous.has(skillId) ? '•' : '✓'} ${skillId}`);
  }

  if (options.write === false) {
    return;
  }

  const merged = mergeConfigs(globalConfig, config);
  const fallbackFormat = merged.format ?? 'claude';
  const grouped = groupSkillsByFormat(merged.skills, registry, fallbackFormat);

  for (const [fmt, skills] of grouped) {
    const artifact = await renderArtifact(skills, {
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

    if (result.targetKind === 'file') {
      info(`Generated: ${result.targetPath}`);
    } else {
      info(
        `Generated ${result.written.length} skill file(s) under ${result.targetPath}`,
      );
    }

    if (options.gitExclude !== false) {
      const target = resolveOutputTarget(effectiveRootDir, fmt, merged.output);
      const added = await ensureGitExcludeEntry(
        effectiveRootDir,
        target.path,
        target.kind,
      );
      if (added) {
        const relative = result.targetPath.slice(effectiveRootDir.length + 1);
        info(
          `Updated .git/info/exclude with ${relative}${result.targetKind === 'directory' ? '/' : ''}`,
        );
      }
    }
  }
}

export function registerSkillInstallCommand(program: Command): void {
  program
    .command('skill:install')
    .alias('install')
    .description(
      'Install skills globally by default, or into the current project with --current',
    )
    .argument('[skillIds...]', 'Skill identifiers to install')
    .option('--category <category>', 'Install all skills from a category')
    .option('--format <format>', 'Output format (default: claude)')
    .option(
      '-g, --global',
      'Install skill globally (~/.magehub/config.yaml; default)',
    )
    .option(
      '-c, --current',
      'Install skill into the current project .magehub.yaml',
    )
    .option('--no-write', 'Skip writing rendered output files')
    .option('--no-git-exclude', 'Skip updating .git/info/exclude')
    .action(
      async (
        skillIds: string[],
        options: {
          category?: string;
          format?: string;
          write?: boolean;
          gitExclude?: boolean;
          global?: boolean;
          current?: boolean;
        },
      ) => runSkillInstallCommand(skillIds, options),
    );
}
