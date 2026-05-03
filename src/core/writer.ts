import { rm } from 'node:fs/promises';
import path from 'node:path';

import type { OutputFormat } from '../types/config.js';
import { pathExists, writeUtf8 } from '../utils/fs.js';
import {
  getFormatMetadata,
  resolveOutputTarget,
  resolveSkillOutputPath,
} from './formats.js';
import type { RenderArtifact } from './renderer.js';
import type { PerSkillArtifact } from './renderer.js';

export interface WriteResult {
  targetPath: string;
  targetKind: 'file' | 'directory';
  written: string[];
}

export async function writeArtifact(
  rootDir: string,
  format: OutputFormat,
  outputOverride: string | undefined,
  artifact: RenderArtifact,
): Promise<WriteResult> {
  const target = resolveOutputTarget(rootDir, format, outputOverride);
  const written: string[] = [];

  if (artifact.kind === 'single-file') {
    await writeUtf8(target.path, artifact.content);
    written.push(target.path);
    return { targetPath: target.path, targetKind: target.kind, written };
  }

  for (const file of artifact.files) {
    const filePath = resolveSkillOutputPath(target.path, format, file.skillId);
    await writeUtf8(filePath, file.content);
    written.push(filePath);
  }

  return { targetPath: target.path, targetKind: target.kind, written };
}

export async function writeSkillDirectories(
  outputDir: string,
  artifact: PerSkillArtifact,
): Promise<WriteResult> {
  const written: string[] = [];

  for (const file of artifact.files) {
    const filePath = path.join(outputDir, file.skillId, 'SKILL.md');
    await writeUtf8(filePath, file.content);
    written.push(filePath);
  }

  return { targetPath: outputDir, targetKind: 'directory', written };
}

export async function removePerSkillFiles(
  rootDir: string,
  format: OutputFormat,
  outputOverride: string | undefined,
  skillIds: string[],
): Promise<string[]> {
  const metadata = getFormatMetadata(format);
  if (
    metadata.strategy !== 'per-skill-file' ||
    metadata.skillFileName === undefined
  ) {
    return [];
  }

  const target = resolveOutputTarget(rootDir, format, outputOverride);
  const removed: string[] = [];

  for (const skillId of skillIds) {
    const filePath = resolveSkillOutputPath(target.path, format, skillId);
    const relativeEntry = metadata.skillFileName(skillId);
    const isNestedEntry =
      relativeEntry.includes(path.sep) || relativeEntry.includes('/');
    const candidate = isNestedEntry ? path.dirname(filePath) : filePath;

    if (await pathExists(candidate)) {
      await rm(candidate, { recursive: true, force: true });
      removed.push(candidate);
    }
  }

  return removed;
}

export async function removeSkillDirectories(
  outputDir: string,
  skillIds: string[],
): Promise<string[]> {
  const removed: string[] = [];

  for (const skillId of skillIds) {
    const skillDir = path.join(outputDir, skillId);
    if (await pathExists(skillDir)) {
      await rm(skillDir, { recursive: true, force: true });
      removed.push(skillDir);
    }
  }

  return removed;
}
