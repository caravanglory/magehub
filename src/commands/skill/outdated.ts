import type { Command } from 'commander';

import { loadConfig } from '../../core/config-manager.js';
import { loadGlobalConfig } from '../../core/global-config.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import {
  checkForUpgrades,
  type OutdatedSkill,
  type UpgradeCheckResult,
} from '../../core/upgrade-checker.js';
import type { MageHubConfig } from '../../types/config.js';
import { CliError } from '../../utils/cli-error.js';
import { info, warn } from '../../utils/logger.js';

function renderOutdatedTable(outdated: OutdatedSkill[]): string {
  const idWidth = Math.max('Skill'.length, ...outdated.map((s) => s.id.length));
  const instWidth = Math.max(
    'Installed'.length,
    ...outdated.map((s) => s.installed.length),
  );
  const availWidth = Math.max(
    'Available'.length,
    ...outdated.map((s) => s.available.length),
  );

  const header =
    'Skill'.padEnd(idWidth) +
    '  ' +
    'Installed'.padEnd(instWidth) +
    '  ' +
    'Available'.padEnd(availWidth);
  const separator = '─'.repeat(idWidth + instWidth + availWidth + 4);
  const rows = outdated.map(
    (s) =>
      s.id.padEnd(idWidth) +
      '  ' +
      s.installed.padEnd(instWidth) +
      '  ' +
      s.available.padEnd(availWidth),
  );

  return [header, separator, ...rows].join('\n');
}

function printResult(result: UpgradeCheckResult, quiet: boolean): void {
  if (result.magehubOutdated && result.latestVersion !== undefined) {
    if (quiet) {
      console.log(`magehub ${result.currentVersion} → ${result.latestVersion}`);
    } else {
      warn(
        `MageHub ${result.currentVersion} → ${result.latestVersion} available. Run \`npm update -g magehub\` to upgrade.`,
      );
    }
    return;
  }

  if (result.outdatedSkills.length === 0) {
    if (!quiet) {
      info('All installed skills are up to date.');
    }
    return;
  }

  if (quiet) {
    for (const s of result.outdatedSkills) {
      console.log(`${s.id} ${s.installed} → ${s.available}`);
    }
    return;
  }

  console.log(renderOutdatedTable(result.outdatedSkills));
  info(
    `\nRun \`magehub skill:upgrade\` to update all, or \`magehub skill:upgrade <id>\` for specific skills.`,
  );
}

async function resolveConfig(
  global: boolean,
  skillId: string | undefined,
  rootDir: string,
): Promise<{
  config: MageHubConfig;
  registryRootDir: string;
}> {
  if (global) {
    const config = await loadGlobalConfig();
    if (config === undefined) {
      throw new CliError(
        'No global config found. Run `magehub skill:install <id>` first.',
        2,
      );
    }
    const { getGlobalConfigDir } = await import('../../core/global-config.js');
    return { config, registryRootDir: getGlobalConfigDir() };
  }

  const globalConfig = await loadGlobalConfig();
  const loaded = await loadConfig(rootDir).catch(() => undefined);
  if (loaded === undefined && globalConfig === undefined) {
    throw new CliError(
      'No config found. Run `magehub skill:install <id>` first.',
      2,
    );
  }

  const config = loaded?.config ?? globalConfig!;

  if (skillId !== undefined) {
    const entry = config.skills.find((e) => e.id === skillId);
    if (entry === undefined) {
      throw new CliError(`Skill not installed: ${skillId}`, 1);
    }
  }

  return { config, registryRootDir: rootDir };
}

export async function runSkillOutdatedCommand(
  options: {
    global?: boolean;
    json?: boolean;
    quiet?: boolean;
    skill?: string;
  },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const { config, registryRootDir } = await resolveConfig(
    options.global === true,
    options.skill,
    effectiveRootDir,
  );

  const globalConfig = options.global ? undefined : await loadGlobalConfig();
  const registry = await createSkillRegistry(registryRootDir, globalConfig);
  const getSkill = (id: string) => registry.getById(id);

  const result = await checkForUpgrades(config, getSkill);

  if (options.skill !== undefined && !result.magehubOutdated) {
    result.outdatedSkills = result.outdatedSkills.filter(
      (s) => s.id === options.skill,
    );
  }

  if (options.json === true) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printResult(result, options.quiet === true);
}

export function registerSkillOutdatedCommand(program: Command): void {
  program
    .command('skill:outdated')
    .alias('outdated')
    .description('Check for outdated skills and MageHub updates')
    .option('-g, --global', 'Check globally installed skills')
    .option('--json', 'Output as JSON')
    .option(
      '-q, --quiet',
      'Minimal output for scripting and AI tool consumption',
    )
    .option('--skill <skillId>', 'Check a specific skill')
    .action(
      async (options: {
        global?: boolean;
        json?: boolean;
        quiet?: boolean;
        skill?: string;
      }) => runSkillOutdatedCommand(options),
    );
}
