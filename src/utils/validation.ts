import { outputFormats, type OutputFormat } from '../types/config.js';
import {
  skillCategories,
  type SkillCategory,
} from '../types/skill.js';
import { CliError } from './cli-error.js';

export function parseSkillCategory(
  value: string | undefined,
): SkillCategory | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!skillCategories.includes(value as SkillCategory)) {
    throw new CliError(`Unsupported category: ${value}`, 1);
  }

  return value as SkillCategory;
}

export function parseOutputFormat(
  value: string | undefined,
  fallback: OutputFormat,
): OutputFormat {
  const candidate = value === 'cursor' ? 'claude' : (value ?? fallback);

  if (!outputFormats.includes(candidate as OutputFormat)) {
    throw new CliError(`Unsupported output format: ${candidate}`, 1);
  }

  return candidate as OutputFormat;
}
