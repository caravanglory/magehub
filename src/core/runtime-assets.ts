import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function resolveAssetRoot(): string {
  const directRoot = path.resolve(moduleDir, '../..');
  if (
    existsSync(path.join(directRoot, 'schema')) &&
    existsSync(path.join(directRoot, 'templates'))
  ) {
    return directRoot;
  }

  const distFallbackRoot = path.resolve(moduleDir, '..');
  if (
    existsSync(path.join(distFallbackRoot, 'schema')) &&
    existsSync(path.join(distFallbackRoot, 'templates'))
  ) {
    return distFallbackRoot;
  }

  return directRoot;
}

const packageRoot = resolveAssetRoot();

export function getPackageVersion(): string {
  const pkg = JSON.parse(
    readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  ) as { version: string };
  return pkg.version;
}

export function resolveBundledSchemaPath(fileName: string): string {
  return path.join(packageRoot, 'schema', fileName);
}

export function resolveBundledSkillsPath(): string {
  return path.join(packageRoot, 'skills');
}

export function resolveBundledTemplatePath(
  format: string,
  variant?: string,
): string {
  const basename = variant === undefined ? format : `${format}.${variant}`;
  return path.join(packageRoot, 'templates', `${basename}.hbs`);
}

export function resolveProjectRelativePath(
  rootDir: string,
  relativePath: string,
): string {
  return path.resolve(rootDir, relativePath);
}

export function isPathInsideProject(
  rootDir: string,
  targetPath: string,
): boolean {
  const normalizedRoot = path.resolve(rootDir) + path.sep;
  const normalizedTarget = path.resolve(targetPath);

  return (
    normalizedTarget === path.resolve(rootDir) ||
    normalizedTarget.startsWith(normalizedRoot)
  );
}
