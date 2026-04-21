import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readUtf8(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

export async function writeUtf8(
  filePath: string,
  content: string,
): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, content, 'utf8');
}
