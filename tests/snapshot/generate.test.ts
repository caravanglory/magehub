import { beforeEach, describe, expect, it } from 'vitest';

import { renderArtifact } from '../../src/core/renderer.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import type { OutputFormat } from '../../src/types/config.js';
import type { Skill } from '../../src/types/skill.js';

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'module-plugin',
    name: 'Plugin Development',
    version: '1.0.0',
    category: 'module',
    description: 'Implement Magento 2 plugins correctly',
    tags: ['plugin', 'interception'],
    magento_versions: ['2.4.x'],
    instructions:
      '### Plugin System\n\nUse the Magento 2 interceptor pattern to extend behavior.',
    conventions: [
      { rule: 'Prefer before plugins over after plugins when possible' },
      { rule: 'Never plugin on __construct methods' },
    ],
    examples: [
      {
        title: 'Plugin di.xml Declaration',
        code: '<type name="Magento\\Catalog\\Model\\Product">\n  <plugin name="vendor_module_product" type="Vendor\\Module\\Plugin\\ProductPlugin" />\n</type>',
        language: 'xml',
      },
      {
        title: 'After Plugin Method',
        code: "public function afterGetName(\n    \\Magento\\Catalog\\Model\\Product $subject,\n    string $result\n): string {\n    return $result . ' (Modified)';\n}",
        language: 'php',
      },
    ],
    anti_patterns: [
      {
        pattern: 'Plugin on __construct',
        problem: 'Constructor plugins are not supported by Magento',
      },
      {
        pattern: 'Plugin on final methods',
        problem: 'Final methods cannot be intercepted',
      },
    ],
    references: [
      {
        title: 'Adobe Developer Docs — Plugins',
        url: 'https://developer.adobe.com/commerce/php/development/components/plugins/',
      },
    ],
    compatibility: ['claude', 'opencode', 'cursor', 'codex', 'qoder', 'trae'],
    ...overrides,
  };
}

const twoSkills: Skill[] = [
  makeSkill(),
  {
    id: 'testing-phpunit',
    name: 'PHPUnit Testing',
    version: '1.0.0',
    category: 'testing',
    description: 'Write PHPUnit tests for Magento 2 modules',
    tags: ['testing', 'phpunit'],
    instructions:
      '### PHPUnit Testing\n\nWrite unit and integration tests for Magento 2 modules.',
    conventions: [{ rule: 'Place unit tests in Test/Unit directory' }],
    examples: [
      {
        title: 'Basic Unit Test',
        code: "class ProductTest extends TestCase\n{\n    public function testGetName(): void\n    {\n        $this->assertEquals('Test', $this->product->getName());\n    }\n}",
        language: 'php',
      },
    ],
    anti_patterns: [
      {
        pattern: 'Testing private methods directly',
        problem: 'Use public API instead',
      },
    ],
    references: [
      {
        title: 'Magento Testing Guide',
        url: 'https://developer.adobe.com/commerce/testing/guide/',
      },
    ],
    compatibility: ['claude', 'opencode', 'cursor', 'codex', 'qoder', 'trae'],
  },
];

const perSkillFormats: OutputFormat[] = ['claude', 'opencode', 'trae'];
const singleFileFormats: OutputFormat[] = [
  'cursor',
  'codex',
  'qoder',
  'markdown',
];

async function snapshotFor(
  skills: Skill[],
  format: OutputFormat,
  options: { includeExamples: boolean; includeAntipatterns: boolean },
): Promise<string> {
  const artifact = await renderArtifact(skills, { format, ...options });
  if (artifact.kind === 'single-file') {
    return artifact.content;
  }
  return artifact.files
    .map((file) => `=== ${file.skillId} ===\n${file.content}`)
    .join('\n\n');
}

describe('generate snapshot tests', () => {
  beforeEach(() => {
    clearSchemaValidatorCache();
  });

  describe('single skill output', () => {
    for (const format of [...perSkillFormats, ...singleFileFormats]) {
      it(`generates stable output for ${format} format`, async () => {
        const output = await snapshotFor([makeSkill()], format, {
          includeExamples: true,
          includeAntipatterns: true,
        });
        expect(output).toMatchSnapshot();
      });
    }
  });

  describe('multi-skill output', () => {
    for (const format of [...perSkillFormats, ...singleFileFormats]) {
      it(`generates stable multi-skill output for ${format} format`, async () => {
        const output = await snapshotFor(twoSkills, format, {
          includeExamples: true,
          includeAntipatterns: true,
        });
        expect(output).toMatchSnapshot();
      });
    }
  });

  describe('option variations', () => {
    it('generates stable output with --no-examples (claude)', async () => {
      const output = await snapshotFor([makeSkill()], 'claude', {
        includeExamples: false,
        includeAntipatterns: true,
      });
      expect(output).toMatchSnapshot();
      expect(output).not.toContain('### Examples');
    });

    it('generates stable output with --no-antipatterns (claude)', async () => {
      const output = await snapshotFor([makeSkill()], 'claude', {
        includeExamples: true,
        includeAntipatterns: false,
      });
      expect(output).toMatchSnapshot();
      expect(output).not.toContain('### Anti-patterns');
    });

    it('generates stable output with both options disabled (claude)', async () => {
      const output = await snapshotFor([makeSkill()], 'claude', {
        includeExamples: false,
        includeAntipatterns: false,
      });
      expect(output).toMatchSnapshot();
      expect(output).not.toContain('### Examples');
      expect(output).not.toContain('### Anti-patterns');
    });

    it('generates stable output with both options disabled (cursor)', async () => {
      const output = await snapshotFor(twoSkills, 'cursor', {
        includeExamples: false,
        includeAntipatterns: false,
      });
      expect(output).toMatchSnapshot();
    });
  });

  describe('format-specific structure', () => {
    it('claude per-skill file has frontmatter and body', async () => {
      const artifact = await renderArtifact([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
      });
      expect(artifact.kind).toBe('per-skill-file');
      if (artifact.kind !== 'per-skill-file') return;
      const content = artifact.files[0].content;
      expect(content).toMatch(/^---\nname: module-plugin\ndescription: /);
      expect(content).toContain('# Plugin Development');
    });

    it('opencode per-skill file has frontmatter', async () => {
      const artifact = await renderArtifact([makeSkill()], {
        format: 'opencode',
        includeExamples: true,
        includeAntipatterns: true,
      });
      if (artifact.kind !== 'per-skill-file') {
        throw new Error('expected per-skill-file');
      }
      expect(artifact.files[0].content).toContain('name: module-plugin');
    });

    it('codex format has Agent Instructions header', async () => {
      const artifact = await renderArtifact([makeSkill()], {
        format: 'codex',
        includeExamples: true,
        includeAntipatterns: true,
      });
      if (artifact.kind !== 'single-file')
        throw new Error('expected single-file');
      expect(artifact.content).toContain(
        '# MageHub — Magento 2 Agent Instructions',
      );
    });

    it('cursor format has frontmatter', async () => {
      const artifact = await renderArtifact([makeSkill()], {
        format: 'cursor',
        includeExamples: true,
        includeAntipatterns: true,
      });
      if (artifact.kind !== 'single-file')
        throw new Error('expected single-file');
      expect(artifact.content).toContain('description: MageHub');
      expect(artifact.content).toContain('alwaysApply: true');
    });

    it('markdown format has generic header', async () => {
      const artifact = await renderArtifact([makeSkill()], {
        format: 'markdown',
        includeExamples: true,
        includeAntipatterns: true,
      });
      if (artifact.kind !== 'single-file')
        throw new Error('expected single-file');
      expect(artifact.content).toContain('# MageHub');
    });
  });
});
