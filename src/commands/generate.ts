import type { Command } from 'commander';

import { loadConfig, mergeConfigs } from '../core/config-manager.js';
import { loadGlobalConfig } from '../core/global-config.js';
import { renderArtifact } from '../core/renderer.js';
import { createSkillRegistry } from '../core/skill-registry.js';
import { writeArtifact } from '../core/writer.js';
import { CliError } from '../utils/cli-error.js';
import { info } from '../utils/logger.js';
import { parseOutputFormat } from '../utils/validation.js';

export async function runGenerateCommand(
  options: {
    format?: string;
    output?: string;
    skills?: string;
    examples?: boolean;
    antipatterns?: boolean;
  },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const loaded = await loadConfig(effectiveRootDir).catch((error: unknown) => {
    const detail = error instanceof Error ? `: ${error.message}` : '';
    throw new CliError(
      `Missing or invalid .magehub.yaml${detail}. Run \`magehub skill:install --current <id>\` to bootstrap.`,
      2,
    );
  });

  const globalConfig = await loadGlobalConfig();
  const merged = mergeConfigs(globalConfig, loaded.config);
  const registry = await createSkillRegistry(effectiveRootDir, globalConfig);

  const format = parseOutputFormat(options.format, merged.format ?? 'claude');
  const selectedSkillIds =
    options.skills
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? merged.skills;

  if (selectedSkillIds.length === 0) {
    throw new CliError('No skills configured for generation.', 1);
  }

  const skills = selectedSkillIds.map((skillId) => {
    const skill = registry.getById(skillId);
    if (skill === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
    if (
      skill.compatibility !== undefined &&
      !skill.compatibility.includes(format)
    ) {
      throw new CliError(
        `Skill ${skillId} is not compatible with format ${format}`,
        3,
      );
    }
    return skill;
  });

  const artifact = await renderArtifact(skills, {
    format,
    includeExamples: options.examples ?? merged.include_examples ?? true,
    includeAntipatterns:
      options.antipatterns ?? merged.include_antipatterns ?? true,
  });

  const result = await writeArtifact(
    effectiveRootDir,
    format,
    options.output ?? merged.output,
    artifact,
  );

  if (result.targetKind === 'file') {
    info(`Generated: ${result.targetPath}`);
  } else {
    info(
      `Generated ${result.written.length} skill file(s) under ${result.targetPath}`,
    );
  }
}

export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .alias('gen')
    .description('Generate context files for an AI tool')
    .option('--format <format>', 'Output format override')
    .option('--output <path>', 'Output file or directory override')
    .option('--skills <ids>', 'Comma-separated skill IDs')
    .option('--no-examples', 'Exclude code examples')
    .option('--no-antipatterns', 'Exclude anti-patterns')
    .action(
      async (options: {
        format?: string;
        output?: string;
        skills?: string;
        examples?: boolean;
        antipatterns?: boolean;
      }) => {
        await runGenerateCommand(options);
      },
    );
}
