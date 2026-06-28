import { readFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import type { Skill } from '../types/skill.js';
import { validateSkillSchema } from './schema-validator.js';
import { normalizeRawSkill } from './skill-normalizer.js';

export interface SkillValidationResult {
  filePath: string;
  skillId?: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  skill?: Skill;
}

function findHeadingWarnings(instructions: string): string[] {
  const lines = instructions.split('\n');
  const warnings: string[] = [];
  let insideFence = false;

  lines.forEach((line, index) => {
    if (/^```/.test(line.trim())) {
      insideFence = !insideFence;
      return;
    }

    if (insideFence) {
      return;
    }

    if (/^#\s/.test(line) || /^##\s/.test(line)) {
      warnings.push(
        `instructions line ${index + 1}: headings must start at ### or deeper`,
      );
    }
  });

  return warnings;
}

export async function validateSkillFile(
  filePath: string,
): Promise<SkillValidationResult> {
  let parsed: unknown;

  try {
    const content = await readFile(filePath, 'utf8');
    parsed = YAML.parse(content);
  } catch (error) {
    return {
      filePath,
      valid: false,
      errors: [error instanceof Error ? error.message : 'YAML parse failure'],
      warnings: [],
    };
  }

  const schemaValidation = await validateSkillSchema(parsed);
  if (!schemaValidation.valid || schemaValidation.data === undefined) {
    return {
      filePath,
      valid: false,
      skillId:
        typeof (parsed as { id?: unknown }).id === 'string'
          ? (parsed as { id: string }).id
          : undefined,
      errors: schemaValidation.errors,
      warnings: [],
    };
  }

  let skill: Skill;
  try {
    const skillDir = path.dirname(filePath);
    skill = await normalizeRawSkill(schemaValidation.data, skillDir);
  } catch (error) {
    return {
      filePath,
      valid: false,
      skillId: schemaValidation.data.id,
      errors: [
        error instanceof Error ? error.message : 'File resolution failure',
      ],
      warnings: [],
    };
  }

  return {
    filePath,
    skillId: skill.id,
    valid: true,
    errors: [],
    warnings: findHeadingWarnings(skill.instructions),
    skill,
  };
}
