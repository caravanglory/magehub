import { beforeEach, describe, expect, it } from 'vitest';

import {
  findOutdatedSkills,
  type OutdatedSkill,
} from '../../src/core/upgrade-checker.js';
import type { SkillEntry } from '../../src/types/config.js';
import type { Skill } from '../../src/types/skill.js';

function makeSkill(id: string, version: string): Skill {
  return {
    id,
    name: id,
    version,
    category: 'module',
    description: `Skill ${id}`,
    instructions: 'test',
  };
}

describe('upgrade-checker', () => {
  describe('findOutdatedSkills', () => {
    let skills: Map<string, Skill>;

    beforeEach(() => {
      skills = new Map([
        ['skill-a', makeSkill('skill-a', '2.0.0')],
        ['skill-b', makeSkill('skill-b', '1.0.0')],
        ['skill-c', makeSkill('skill-c', '3.0.0')],
      ]);
    });

    const getSkill = (id: string) => skills.get(id);

    it('detects outdated skills', () => {
      const entries: SkillEntry[] = [
        { id: 'skill-a', installed_version: '1.0.0' },
        { id: 'skill-b', installed_version: '1.0.0' },
      ];

      const result = findOutdatedSkills(entries, getSkill);

      expect(result).toEqual<OutdatedSkill[]>([
        { id: 'skill-a', installed: '1.0.0', available: '2.0.0' },
      ]);
    });

    it('returns empty array when all skills are up to date', () => {
      const entries: SkillEntry[] = [
        { id: 'skill-a', installed_version: '2.0.0' },
        { id: 'skill-b', installed_version: '1.0.0' },
      ];

      const result = findOutdatedSkills(entries, getSkill);

      expect(result).toEqual([]);
    });

    it('skips entries without installed_version', () => {
      const entries: SkillEntry[] = [
        { id: 'skill-a' },
        { id: 'skill-b', installed_version: '0.5.0' },
      ];

      const result = findOutdatedSkills(entries, getSkill);

      expect(result).toEqual<OutdatedSkill[]>([
        { id: 'skill-b', installed: '0.5.0', available: '1.0.0' },
      ]);
    });

    it('skips entries whose skill is not in registry', () => {
      const entries: SkillEntry[] = [
        { id: 'nonexistent', installed_version: '1.0.0' },
      ];

      const result = findOutdatedSkills(entries, getSkill);

      expect(result).toEqual([]);
    });

    it('handles multiple outdated skills', () => {
      const entries: SkillEntry[] = [
        { id: 'skill-a', installed_version: '1.0.0' },
        { id: 'skill-b', installed_version: '0.5.0' },
        { id: 'skill-c', installed_version: '2.0.0' },
      ];

      const result = findOutdatedSkills(entries, getSkill);

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.id)).toEqual([
        'skill-a',
        'skill-b',
        'skill-c',
      ]);
    });

    it('returns empty array for empty entries', () => {
      const result = findOutdatedSkills([], getSkill);

      expect(result).toEqual([]);
    });
  });
});
