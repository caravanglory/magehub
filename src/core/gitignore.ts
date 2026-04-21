import path from 'node:path';

import { pathExists, readUtf8, writeUtf8 } from '../utils/fs.js';

const HEADER = '# MageHub generated output';

export async function ensureGitignoreEntry(
  rootDir: string,
  absolutePath: string,
  kind: 'file' | 'directory',
): Promise<boolean> {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const relative = path
    .relative(rootDir, absolutePath)
    .split(path.sep)
    .join('/');
  const normalized = kind === 'directory' ? `${relative}/` : relative;

  if (await pathExists(gitignorePath)) {
    const content = await readUtf8(gitignorePath);
    const lines = content.split('\n').map((line) => line.trim());
    if (lines.includes(normalized)) {
      return false;
    }
    const separator = content.endsWith('\n') ? '\n' : '\n\n';
    await writeUtf8(
      gitignorePath,
      `${content}${separator}${HEADER}\n${normalized}\n`,
    );
    return true;
  }

  await writeUtf8(gitignorePath, `${HEADER}\n${normalized}\n`);
  return true;
}
