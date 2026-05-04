import path from 'node:path';

import type { OutputFormat } from '../types/config.js';
import { pathExists } from '../utils/fs.js';

export type RenderStrategy = 'single-file' | 'per-skill-file';

export interface FormatMetadata {
  strategy: RenderStrategy;
  outputPath: string;
  skillFileName?: (skillId: string) => string;
}

export interface OutputTarget {
  kind: 'file' | 'directory';
  path: string;
}

const FORMAT_METADATA: Record<OutputFormat, FormatMetadata> = {
  claude: {
    strategy: 'per-skill-file',
    outputPath: path.join('.claude', 'skills'),
    skillFileName: (skillId) => path.join(skillId, 'SKILL.md'),
  },
  opencode: {
    strategy: 'per-skill-file',
    outputPath: path.join('.opencode', 'skills'),
    skillFileName: (skillId) => path.join(skillId, 'SKILL.md'),
  },
  codex: {
    strategy: 'per-skill-file',
    outputPath: path.join('.codex', 'skills'),
    skillFileName: (skillId) => path.join(skillId, 'SKILL.md'),
  },
  qoder: {
    strategy: 'per-skill-file',
    outputPath: path.join('.qoder', 'skills'),
    skillFileName: (skillId) => path.join(skillId, 'SKILL.md'),
  },
};

export function getFormatMetadata(format: OutputFormat): FormatMetadata {
  return FORMAT_METADATA[format];
}

export function resolveOutputTarget(
  rootDir: string,
  format: OutputFormat,
  override?: string,
): OutputTarget {
  const metadata = FORMAT_METADATA[format];
  const relative = override ?? metadata.outputPath;
  return {
    kind: metadata.strategy === 'per-skill-file' ? 'directory' : 'file',
    path: path.isAbsolute(relative) ? relative : path.join(rootDir, relative),
  };
}

export function resolveSkillOutputPath(
  outputDir: string,
  format: OutputFormat,
  skillId: string,
): string {
  const metadata = FORMAT_METADATA[format];
  if (metadata.skillFileName === undefined) {
    throw new Error(`Format ${format} is not a per-skill-file format`);
  }
  return path.join(outputDir, metadata.skillFileName(skillId));
}

const FORMAT_DETECTION_ORDER: ReadonlyArray<{
  format: OutputFormat;
  marker: string;
}> = [
  { format: 'claude', marker: '.claude' },
  { format: 'opencode', marker: '.opencode' },
  { format: 'qoder', marker: '.qoder' },
];

export async function detectFormat(
  rootDir: string,
  fallback: OutputFormat = 'claude',
): Promise<OutputFormat> {
  for (const { format, marker } of FORMAT_DETECTION_ORDER) {
    if (await pathExists(path.join(rootDir, marker))) {
      return format;
    }
  }
  return fallback;
}
