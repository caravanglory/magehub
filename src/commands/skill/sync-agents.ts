import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import type { Command } from 'commander';

import { renderPerSkillArtifact } from '../../core/renderer.js';
import { loadAllSkills, type LoadedSkill } from '../../core/skill-loader.js';
import { resolveBundledSkillsPath } from '../../core/runtime-assets.js';
import { writeUtf8 } from '../../utils/fs.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';

export interface SyncAgentSkillFilesOptions {
  check?: boolean;
  skillsDir?: string;
}

export interface SyncedAgentSkillFile {
  skillId: string;
  filePath: string;
}

async function renderAgentSkillFile(entry: LoadedSkill): Promise<string> {
  const artifact = await renderPerSkillArtifact([entry.skill], {
    format: 'agents',
    includeExamples: true,
    includeAntipatterns: true,
    templateVariant: 'export.skill',
    skillEntries: [
      {
        id: entry.skill.id,
        format: 'agents',
        installed_version: entry.skill.version,
      },
    ],
  });

  return artifact.files[0].content;
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}

function hasMageHubFrontmatter(content: string): boolean {
  if (!content.startsWith('---\n')) {
    return false;
  }

  const endIndex = content.indexOf('\n---', 4);
  if (endIndex === -1) {
    return false;
  }

  return content
    .slice(4, endIndex)
    .split('\n')
    .some((line) => line.startsWith('magehub_version:'));
}

async function listSkillMarkdownFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isNotFoundError(error)) {
        return [];
      }
      throw error;
    },
  );

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return listSkillMarkdownFiles(fullPath);
      }
      return entry.name === 'SKILL.md' ? [fullPath] : [];
    }),
  );

  return nested.flat();
}

async function findGeneratedSkillMarkdownFiles(
  skillsDir: string,
): Promise<string[]> {
  const files = await listSkillMarkdownFiles(skillsDir);
  const generated = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, 'utf8').catch(() => undefined);
      return content !== undefined && hasMageHubFrontmatter(content)
        ? filePath
        : undefined;
    }),
  );

  return generated.filter(
    (filePath): filePath is string => filePath !== undefined,
  );
}

export async function syncAgentSkillFiles(
  options: SyncAgentSkillFilesOptions = {},
): Promise<SyncedAgentSkillFile[]> {
  const skillsDir = options.skillsDir ?? resolveBundledSkillsPath();
  const entries = await loadAllSkills(skillsDir);
  const synced: SyncedAgentSkillFile[] = [];
  const stale: string[] = [];
  const expectedFiles = new Set<string>();

  for (const entry of entries) {
    const content = await renderAgentSkillFile(entry);
    const filePath = path.join(path.dirname(entry.filePath), 'SKILL.md');
    expectedFiles.add(filePath);

    if (options.check === true) {
      const existing = await readFile(filePath, 'utf8').catch(() => undefined);
      if (existing !== content) {
        stale.push(filePath);
      }
    } else {
      await writeUtf8(filePath, content);
    }

    synced.push({ skillId: entry.skill.id, filePath });
  }

  const orphaned = (await findGeneratedSkillMarkdownFiles(skillsDir)).filter(
    (filePath) => !expectedFiles.has(filePath),
  );

  if (options.check === true) {
    stale.push(...orphaned);
  } else {
    await Promise.all(
      orphaned.map((filePath) => rm(filePath, { force: true })),
    );
  }

  if (stale.length > 0) {
    throw new CliError(
      `Agent SKILL.md files are out of date:\n${stale.join('\n')}\nRun \`npm run skills:sync\` to update them.`,
      1,
    );
  }

  return synced;
}

export async function runSkillSyncAgentsCommand(options: {
  check?: boolean;
}): Promise<void> {
  const synced = await syncAgentSkillFiles({ check: options.check });
  const action = options.check === true ? 'Checked' : 'Synced';
  info(`${action} ${synced.length} agent skill file(s).`);
}

export function registerSkillSyncAgentsCommand(program: Command): void {
  program
    .command('skill:sync-agents')
    .description('Sync Vercel skills-compatible SKILL.md files')
    .option('--check', 'Fail if generated SKILL.md files are out of date')
    .action(async (options: { check?: boolean }) =>
      runSkillSyncAgentsCommand(options),
    );
}
