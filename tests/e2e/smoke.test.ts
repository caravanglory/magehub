import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { runGenerateCommand } from '../../src/commands/generate.js';
import { runSetupInitCommand } from '../../src/commands/setup/init.js';
import { runSkillInstallCommand } from '../../src/commands/skill/install.js';
import {
  getFormatMetadata,
  resolveOutputTarget,
  resolveSkillOutputPath,
} from '../../src/core/formats.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import type { OutputFormat } from '../../src/types/config.js';
import { PROJECT_ROOT } from '../helpers/fixture.js';
import { parseFrontMatter } from '../helpers/front-matter.js';
import {
  assertCursorFrontMatter,
  assertFencedCodeBlocks,
  assertMagentoDomainTerms,
  assertNoUnresolvedPlaceholders,
  assertQoderFrontMatter,
} from '../helpers/output-validators.js';
import {
  generateSmokeReport,
  type FormatResult,
} from '../helpers/smoke-report.js';

const ALL_FORMATS: OutputFormat[] = [
  'claude',
  'opencode',
  'cursor',
  'codex',
  'qoder',
  'trae',
];

const ALL_SKILL_IDS = [
  'admin-ui-grid',
  'api-graphql-resolver',
  'hyva-module-compatibility',
  'module-di',
  'module-plugin',
  'module-scaffold',
  'module-setup',
  'performance',
  'standards-coding',
  'testing-phpunit',
];

interface FormatOutput {
  format: OutputFormat;
  target: { kind: 'file' | 'directory'; path: string };
  aggregatedContent: string;
  files: Array<{ path: string; content: string }>;
}

describe('E2E smoke test — full lifecycle against simulated Magento 2 project', () => {
  let rootDir: string;
  const outputs = new Map<OutputFormat, FormatOutput>();

  beforeEach(() => {
    clearSchemaValidatorCache();
  });

  beforeAll(async () => {
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'magehub-smoke-'));

    await mkdir(path.join(rootDir, 'app', 'etc'), { recursive: true });
    await writeFile(
      path.join(rootDir, 'composer.json'),
      JSON.stringify({
        name: 'magento/project-community-edition',
        type: 'project',
        require: { 'magento/product-community-edition': '2.4.7' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(rootDir, 'app', 'etc', 'env.php'),
      "<?php\nreturn ['db' => ['host' => 'localhost']];",
      'utf8',
    );
    await writeFile(
      path.join(rootDir, 'app', 'etc', 'di.xml'),
      '<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>',
      'utf8',
    );

    await cp(path.join(PROJECT_ROOT, 'skills'), path.join(rootDir, 'skills'), {
      recursive: true,
    });

    await mkdir(path.join(rootDir, 'schema'), { recursive: true });
    await cp(
      path.join(PROJECT_ROOT, 'schema', 'skill.schema.json'),
      path.join(rootDir, 'schema', 'skill.schema.json'),
    );
    await cp(
      path.join(PROJECT_ROOT, 'schema', 'config.schema.json'),
      path.join(rootDir, 'schema', 'config.schema.json'),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runSetupInitCommand({ format: 'claude', gitExclude: false }, rootDir);
    await runSkillInstallCommand(
      ALL_SKILL_IDS,
      { current: true, write: false, gitExclude: false },
      rootDir,
    );

    for (const format of ALL_FORMATS) {
      clearSchemaValidatorCache();
      await runGenerateCommand({ format }, rootDir);
      const target = resolveOutputTarget(rootDir, format);

      if (target.kind === 'file') {
        const content = await readFile(target.path, 'utf8');
        outputs.set(format, {
          format,
          target,
          aggregatedContent: content,
          files: [{ path: target.path, content }],
        });
      } else {
        const files: Array<{ path: string; content: string }> = [];
        for (const skillId of ALL_SKILL_IDS) {
          const filePath = resolveSkillOutputPath(target.path, format, skillId);
          const content = await readFile(filePath, 'utf8');
          files.push({ path: filePath, content });
        }
        outputs.set(format, {
          format,
          target,
          aggregatedContent: files.map((file) => file.content).join('\n\n'),
          files,
        });
      }
    }

    logSpy.mockRestore();
  });

  afterAll(async () => {
    const reportResults: FormatResult[] = [];
    for (const format of ALL_FORMATS) {
      const result = outputs.get(format);
      if (result === undefined) continue;
      const { body } = parseFrontMatter(result.aggregatedContent);
      const h2Count = (body.match(/^## /gm) ?? []).length;
      reportResults.push({
        format,
        outputPath: path.relative(rootDir, result.target.path),
        content: result.aggregatedContent,
        fileSize: Buffer.byteLength(result.aggregatedContent, 'utf8'),
        skillCount: result.files.length > 1 ? result.files.length : h2Count,
        hasFrontMatter:
          result.files.length === 1
            ? Object.keys(parseFrontMatter(result.files[0].content).data)
                .length > 0
            : result.files.every(
                (file) =>
                  Object.keys(parseFrontMatter(file.content).data).length > 0,
              ),
      });
    }

    if (reportResults.length > 0) {
      await generateSmokeReport(reportResults);
    }

    await rm(rootDir, { recursive: true, force: true });
  });

  it('initializes in a simulated Magento 2 project directory', () => {
    expect(existsSync(path.join(rootDir, 'composer.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'app', 'etc', 'env.php'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'app', 'etc', 'di.xml'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.magehub.yaml'))).toBe(true);
  });

  it('installs all 10 bundled skills into config', async () => {
    const configContent = await readFile(
      path.join(rootDir, '.magehub.yaml'),
      'utf8',
    );
    for (const skillId of ALL_SKILL_IDS) {
      expect(configContent, `Expected skill "${skillId}" in config`).toContain(
        skillId,
      );
    }
  });

  describe.each(ALL_FORMATS)('format: %s', (format) => {
    it('writes output to the expected target', () => {
      const result = outputs.get(format);
      expect(result, `No output captured for format ${format}`).toBeDefined();
      expect(existsSync(result!.target.path)).toBe(true);
    });

    it('produces the right shape (file vs per-skill directory)', async () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      const metadata = getFormatMetadata(format);
      if (metadata.strategy === 'single-file') {
        expect(result!.files).toHaveLength(1);
      } else {
        expect(result!.files.length).toBe(ALL_SKILL_IDS.length);
        const entries = await readdir(result!.target.path);
        expect(entries.length).toBeGreaterThanOrEqual(ALL_SKILL_IDS.length);
      }
    });

    it('contains no unresolved Handlebars placeholders', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      for (const file of result!.files) {
        assertNoUnresolvedPlaceholders(file.content);
      }
    });

    it('contains fenced code blocks with language tags', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertFencedCodeBlocks(result!.aggregatedContent);
    });

    it('includes Magento-specific domain terms', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertMagentoDomainTerms(result!.aggregatedContent);
    });

    it('has correct front-matter conventions', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();

      if (format === 'cursor') {
        assertCursorFrontMatter(result!.files[0].content);
        return;
      }
      if (format === 'qoder') {
        assertQoderFrontMatter(result!.files[0].content);
        return;
      }
      if (format === 'claude' || format === 'opencode') {
        for (const file of result!.files) {
          const { data } = parseFrontMatter(file.content);
          expect(data).toHaveProperty('name');
          expect(data).toHaveProperty('description');
          expect(typeof data['description']).toBe('string');
        }
        return;
      }
      if (format === 'trae') {
        for (const file of result!.files) {
          const { data } = parseFrontMatter(file.content);
          expect(data).toHaveProperty('description');
        }
        return;
      }
      // codex: no frontmatter
      const { data } = parseFrontMatter(result!.files[0].content);
      expect(Object.keys(data).length).toBe(0);
    });
  });
});
