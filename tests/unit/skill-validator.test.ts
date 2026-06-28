import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

import { beforeEach, describe, expect, it } from 'vitest';

import { validateSkillFile } from '../../src/core/skill-validator.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import { createFixtureRepo, makeSkillYaml } from '../helpers/fixture.js';

describe('skill-validator', () => {
  let rootDir: string;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'valid-skill',
          yaml: makeSkillYaml({
            id: 'valid-skill',
            instructions: '### Valid\n\nContent here.',
          }),
        },
      ],
    });
  });

  it('validates a valid skill with ### headings and reports no warnings', async () => {
    const filePath = path.join(
      rootDir,
      'skills',
      'module',
      'valid-skill',
      'skill.yaml',
    );
    const result = await validateSkillFile(filePath);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.skillId).toBe('valid-skill');
    expect(result.skill).toBeDefined();
  });

  it('validates optional agent contract fields', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'contract-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      makeSkillYaml({
        id: 'contract-skill',
        use_when: ['The task needs a module scaffold'],
        do_not_use_when: ['The task is a code review'],
        required_inputs: ['Vendor name'],
        workflow: ['Read the current module structure', 'Create files'],
        guardrails: [
          { rule: 'Do not run destructive commands' },
          { rule: 'Ask before database resets', approval_required: true },
        ],
        verification: ['Run bin/magento module:status'],
        output_contract: ['List files changed and verification results'],
        files: [
          {
            path: 'registration.php',
            description: 'Module registration file',
            template: '<?php\ndeclare(strict_types=1);',
          },
        ],
        freshness: {
          last_reviewed: '2026-06-28',
          sources: ['Adobe Commerce 2.4.x docs'],
        },
      }),
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.skill?.workflow).toHaveLength(2);
    expect(result.skill?.guardrails?.[1].approval_required).toBe(true);
    expect(result.skill?.files?.[0].template).toContain('strict_types');
    expect(result.skill?.freshness?.last_reviewed).toBe('2026-06-28');
  });

  it('warns on # heading in instructions', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'heading-h1');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      makeSkillYaml({
        id: 'heading-h1',
        instructions: '# Top Level\n\nContent.',
      }),
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('headings must start at ###');
    expect(result.warnings[0]).toContain('line 1');
  });

  it('warns on ## heading in instructions', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'heading-h2');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      makeSkillYaml({
        id: 'heading-h2',
        instructions: '## Second Level\n\nContent.',
      }),
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('headings must start at ###');
  });

  it('does not warn on ### or deeper headings', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'heading-ok');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      makeSkillYaml({
        id: 'heading-ok',
        instructions: '### Third\n\n#### Fourth\n\n##### Fifth\n\nContent.',
      }),
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('reports multiple heading warnings', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'multi-warn');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      makeSkillYaml({
        id: 'multi-warn',
        instructions: '# Title\n\n## Section\n\n### OK\n\n## Another',
      }),
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(3);
  });

  it('reports schema validation errors for missing required fields', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'incomplete');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      'id: incomplete\nname: Incomplete\n',
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
    expect(result.skillId).toBe('incomplete');
  });

  it('reports schema errors for invalid category', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'bad-cat');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      makeSkillYaml({ id: 'bad-cat', category: 'nonexistent' }),
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('category'))).toBe(true);
  });

  it('reports YAML parse errors', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'broken-yaml');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'skill.yaml'),
      ':\n  invalid: [yaml\n  broken: {{',
      'utf8',
    );

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports file not found as validation error (not exception)', async () => {
    const result = await validateSkillFile(
      path.join(rootDir, 'nonexistent.yaml'),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('ENOENT');
  });

  it('reports schema errors for additional properties', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'extra-prop');
    await mkdir(skillDir, { recursive: true });
    const yaml = makeSkillYaml({ id: 'extra-prop' }) + 'unknown_field: oops\n';
    await writeFile(path.join(skillDir, 'skill.yaml'), yaml, 'utf8');

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('additional'))).toBe(true);
  });

  it('validates skill with instructions_file and reports no errors', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'ext-instr');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'instructions.md'),
      '### External\n\nContent.',
      'utf8',
    );
    const yaml = [
      'id: ext-instr',
      'name: External Instructions',
      'version: "1.0.0"',
      'category: module',
      'description: Has external instructions',
      'instructions_file: instructions.md',
    ].join('\n');
    await writeFile(path.join(skillDir, 'skill.yaml'), yaml, 'utf8');

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.skill?.instructions).toBe('### External\n\nContent.');
  });

  it('reports error when instructions_file references a missing file', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'missing-file');
    await mkdir(skillDir, { recursive: true });
    const yaml = [
      'id: missing-file',
      'name: Missing File',
      'version: "1.0.0"',
      'category: module',
      'description: References missing file',
      'instructions_file: nonexistent.md',
    ].join('\n');
    await writeFile(path.join(skillDir, 'skill.yaml'), yaml, 'utf8');

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ENOENT'))).toBe(true);
  });

  it('checks heading warnings in externally loaded instructions', async () => {
    const skillDir = path.join(rootDir, 'skills', 'module', 'ext-heading');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, 'instructions.md'),
      '# Top Level\n\n## Second\n\n### OK',
      'utf8',
    );
    const yaml = [
      'id: ext-heading',
      'name: External Heading',
      'version: "1.0.0"',
      'category: module',
      'description: External instructions with bad headings',
      'instructions_file: instructions.md',
    ].join('\n');
    await writeFile(path.join(skillDir, 'skill.yaml'), yaml, 'utf8');

    const result = await validateSkillFile(path.join(skillDir, 'skill.yaml'));

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('headings must start at ###');
  });
});
