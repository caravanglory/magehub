import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { syncAgentSkillFiles } from '../../src/commands/skill/sync-agents.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import { createFixtureRepo, makeSkillYaml } from '../helpers/fixture.js';

describe('agent-skills-sync', () => {
  let rootDir: string;
  let skillsDir: string;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'module-alpha',
          yaml: makeSkillYaml({
            id: 'module-alpha',
            name: 'Alpha',
            description: 'Alpha skill for Magento work',
          }),
        },
      ],
    });
    skillsDir = path.join(rootDir, 'skills');
  });

  it('writes Vercel skills-compatible SKILL.md files next to skill.yaml', async () => {
    const synced = await syncAgentSkillFiles({ skillsDir });
    const skillPath = path.join(
      skillsDir,
      'module',
      'module-alpha',
      'SKILL.md',
    );

    expect(synced).toEqual([{ skillId: 'module-alpha', filePath: skillPath }]);

    const content = await readFile(skillPath, 'utf8');
    expect(content).toContain('name: module-alpha');
    expect(content).toContain('description: "Alpha skill for Magento work"');
    expect(content).toContain('# Alpha');
    expect(content).not.toContain('MageHub Pre-use Check');
    expect(content).not.toContain('magehub skill:outdated');
  });

  it('fails check mode when SKILL.md files are stale', async () => {
    await syncAgentSkillFiles({ skillsDir });
    await writeFile(
      path.join(skillsDir, 'module', 'module-alpha', 'SKILL.md'),
      'stale',
      'utf8',
    );

    await expect(
      syncAgentSkillFiles({ skillsDir, check: true }),
    ).rejects.toThrow('Agent SKILL.md files are out of date');
  });

  it('fails check mode when orphaned generated SKILL.md files exist', async () => {
    const orphanDir = path.join(skillsDir, 'module', 'old-alpha');
    const orphanPath = path.join(orphanDir, 'SKILL.md');
    await mkdir(orphanDir, { recursive: true });
    await writeFile(
      orphanPath,
      [
        '---',
        'name: old-alpha',
        'description: "Old generated skill"',
        'magehub_version: 0.1.0',
        '---',
        '',
        '# Old Alpha',
      ].join('\n'),
      'utf8',
    );

    await expect(
      syncAgentSkillFiles({ skillsDir, check: true }),
    ).rejects.toThrow(orphanPath);
  });

  it('removes orphaned generated SKILL.md files during sync', async () => {
    const orphanDir = path.join(skillsDir, 'module', 'old-alpha');
    const orphanPath = path.join(orphanDir, 'SKILL.md');
    await mkdir(orphanDir, { recursive: true });
    await writeFile(
      orphanPath,
      [
        '---',
        'name: old-alpha',
        'description: "Old generated skill"',
        'magehub_version: 0.1.0',
        '---',
        '',
        '# Old Alpha',
      ].join('\n'),
      'utf8',
    );

    await syncAgentSkillFiles({ skillsDir });

    await expect(readFile(orphanPath, 'utf8')).rejects.toThrow();
  });
});
