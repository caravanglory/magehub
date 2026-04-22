import { stat } from 'node:fs/promises';
import path from 'node:path';

import { pathExists, readUtf8, writeUtf8 } from '../utils/fs.js';

const HEADER = '# MageHub generated output';

async function isGitRepoRoot(rootDir: string): Promise<boolean> {
  try {
    const info = await stat(path.join(rootDir, '.git'));
    return info.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureGitExcludeEntry(
  rootDir: string,
  absolutePath: string,
  kind: 'file' | 'directory',
): Promise<boolean> {
  if (!(await isGitRepoRoot(rootDir))) {
    return false;
  }

  const excludePath = path.join(rootDir, '.git', 'info', 'exclude');
  const relative = path
    .relative(rootDir, absolutePath)
    .split(path.sep)
    .join('/');
  const normalized = kind === 'directory' ? `${relative}/` : relative;

  if (await pathExists(excludePath)) {
    const content = await readUtf8(excludePath);
    const lines = content.split('\n').map((line) => line.trim());
    if (lines.includes(normalized)) {
      return false;
    }
    const separator = content.endsWith('\n') ? '\n' : '\n\n';
    await writeUtf8(
      excludePath,
      `${content}${separator}${HEADER}\n${normalized}\n`,
    );
    return true;
  }

  await writeUtf8(excludePath, `${HEADER}\n${normalized}\n`);
  return true;
}
