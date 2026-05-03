import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  RawSkill,
  RawSkillExample,
  Skill,
  SkillExample,
  SupportedTool,
} from '../types/skill.js';

function normalizeCompatibility(
  compatibility: RawSkill['compatibility'],
): Skill['compatibility'] {
  if (compatibility === undefined) {
    return undefined;
  }

  return compatibility.map((tool) => tool as SupportedTool);
}

async function resolveExampleCode(
  raw: RawSkillExample,
  skillDir: string,
): Promise<SkillExample> {
  const code =
    raw.code_file !== undefined
      ? await readFile(path.resolve(skillDir, raw.code_file), 'utf8')
      : raw.code!;

  return {
    title: raw.title,
    ...(raw.description !== undefined && { description: raw.description }),
    code,
    ...(raw.language !== undefined && { language: raw.language }),
  };
}

export async function normalizeRawSkill(
  raw: RawSkill,
  skillDir: string,
): Promise<Skill> {
  const instructions =
    raw.instructions_file !== undefined
      ? await readFile(path.resolve(skillDir, raw.instructions_file), 'utf8')
      : raw.instructions!;

  const examples =
    raw.examples !== undefined
      ? await Promise.all(
          raw.examples.map(async (ex) => resolveExampleCode(ex, skillDir)),
        )
      : undefined;

  const {
    instructions_file: _fileRef,
    instructions: _inline,
    examples: _rawExamples,
    ...metadata
  } = raw;

  // Prefix variables are used solely to exclude keys from the spread.
  // The void expressions satisfy the no-unused-vars lint rule.
  void _fileRef;
  void _inline;
  void _rawExamples;

  return {
    ...metadata,
    compatibility: normalizeCompatibility(metadata.compatibility),
    instructions,
    ...(examples !== undefined && { examples }),
  };
}
