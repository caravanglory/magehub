import { readFile } from 'node:fs/promises';

import type { MageHubConfig, OutputFormat } from '../types/config.js';
import type { Skill } from '../types/skill.js';
import { renderTemplate } from '../utils/template.js';
import { getFormatMetadata } from './formats.js';
import { resolveBundledTemplatePath } from './runtime-assets.js';

export interface RenderOptions {
  format: OutputFormat;
  includeExamples: boolean;
  includeAntipatterns: boolean;
}

export interface SingleFileArtifact {
  kind: 'single-file';
  content: string;
}

export interface PerSkillArtifact {
  kind: 'per-skill-file';
  files: Array<{ skillId: string; content: string }>;
}

export type RenderArtifact = SingleFileArtifact | PerSkillArtifact;

function renderSkillBody(
  skill: Skill,
  options: Pick<RenderOptions, 'includeExamples' | 'includeAntipatterns'>,
): string {
  const sections: string[] = [];

  sections.push(skill.instructions.trim());

  if ((skill.conventions?.length ?? 0) > 0) {
    sections.push('', '### Conventions', '');
    for (const convention of skill.conventions ?? []) {
      sections.push(`- ${convention.rule}`);
    }
  }

  if (options.includeExamples && (skill.examples?.length ?? 0) > 0) {
    sections.push('', '### Examples', '');
    for (const example of skill.examples ?? []) {
      sections.push(`#### ${example.title}`, '');
      if (example.description !== undefined) {
        sections.push(example.description, '');
      }
      const language = example.language ?? 'text';
      sections.push('```' + language, example.code.trim(), '```', '');
    }
  }

  if (options.includeAntipatterns && (skill.anti_patterns?.length ?? 0) > 0) {
    sections.push('', '### Anti-patterns', '');
    for (const antiPattern of skill.anti_patterns ?? []) {
      sections.push(`- ${antiPattern.pattern}: ${antiPattern.problem}`);
    }
  }

  if ((skill.references?.length ?? 0) > 0) {
    sections.push('', '### References', '');
    for (const reference of skill.references ?? []) {
      sections.push(`- [${reference.title}](${reference.url})`);
    }
  }

  return sections.join('\n').trim();
}

function renderSkillSection(
  skill: Skill,
  options: Pick<RenderOptions, 'includeExamples' | 'includeAntipatterns'>,
): string {
  const heading = `## ${skill.name} (${skill.id})`;
  const body = renderSkillBody(skill, options);
  return `${heading}\n\n${body}`;
}

export function renderSkillDetail(skill: Skill): string {
  const lines: string[] = [];

  lines.push(`${skill.name} (${skill.id}) v${skill.version}`);
  lines.push(`Category: ${skill.category}`);
  lines.push(`Description: ${skill.description}`);

  if ((skill.tags?.length ?? 0) > 0) {
    lines.push(`Tags: ${(skill.tags ?? []).join(', ')}`);
  }

  if ((skill.magento_versions?.length ?? 0) > 0) {
    lines.push(`Magento: ${(skill.magento_versions ?? []).join(', ')}`);
  }

  if ((skill.conventions?.length ?? 0) > 0) {
    lines.push('', 'Conventions:');
    for (const convention of skill.conventions ?? []) {
      lines.push(`  - ${convention.rule}`);
    }
  }

  if ((skill.examples?.length ?? 0) > 0) {
    lines.push('', `Examples (${(skill.examples ?? []).length}):`);
    for (const example of skill.examples ?? []) {
      lines.push(`  - ${example.title}`);
    }
  }

  if ((skill.anti_patterns?.length ?? 0) > 0) {
    lines.push('', `Anti-patterns (${(skill.anti_patterns ?? []).length}):`);
    for (const antiPattern of skill.anti_patterns ?? []) {
      lines.push(`  - ${antiPattern.pattern}: ${antiPattern.problem}`);
    }
  }

  if ((skill.references?.length ?? 0) > 0) {
    lines.push('', 'References:');
    for (const reference of skill.references ?? []) {
      lines.push(`  - ${reference.title}: ${reference.url}`);
    }
  }

  return lines.join('\n');
}

export function renderSkillListTable(skills: Skill[]): string {
  const header = 'ID'.padEnd(24) + 'Version'.padEnd(10) + 'Description';
  const body = skills.map(
    (skill) =>
      skill.id.padEnd(24) + skill.version.padEnd(10) + skill.description,
  );
  return [header, ...body].join('\n');
}

export function renderSkillSearchResults(
  skills: Skill[],
  keyword: string,
): string {
  const lines = [`Search results for "${keyword}":`, ''];
  for (const skill of skills) {
    lines.push(`${skill.id.padEnd(24)}${skill.description}`);
  }
  lines.push(
    '',
    `Found ${skills.length} skill${skills.length === 1 ? '' : 's'} matching "${keyword}"`,
  );
  return lines.join('\n');
}

export function renderConfig(config: MageHubConfig): string {
  return JSON.stringify(config, null, 2);
}

function buildSingleFileContext(
  skills: Skill[],
  content: string,
): Record<string, unknown> {
  return {
    content,
    skills: skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
    })),
    skillCount: skills.length,
    skillList: skills.map((skill) => skill.id).join(', '),
  };
}

function buildPerSkillContext(
  skill: Skill,
  body: string,
): Record<string, unknown> {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    version: skill.version,
    category: skill.category,
    tags: skill.tags ?? [],
    body,
  };
}

async function loadTemplate(
  format: OutputFormat,
  variant?: string,
): Promise<string> {
  const templatePath = resolveBundledTemplatePath(format, variant);
  return readFile(templatePath, 'utf8');
}

export async function renderArtifact(
  skills: Skill[],
  options: RenderOptions,
): Promise<RenderArtifact> {
  const metadata = getFormatMetadata(options.format);

  if (metadata.strategy === 'single-file') {
    const bodyOptions = {
      includeExamples: options.includeExamples,
      includeAntipatterns: options.includeAntipatterns,
    };
    const template = await loadTemplate(options.format);
    const content = skills
      .map((skill) => renderSkillSection(skill, bodyOptions))
      .join('\n\n---\n\n');
    return {
      kind: 'single-file',
      content: renderTemplate(
        template,
        buildSingleFileContext(skills, content),
      ),
    };
  }

  return renderPerSkillArtifact(skills, options);
}

export async function renderPerSkillArtifact(
  skills: Skill[],
  options: RenderOptions,
): Promise<PerSkillArtifact> {
  const bodyOptions = {
    includeExamples: options.includeExamples,
    includeAntipatterns: options.includeAntipatterns,
  };
  const template = await loadTemplate(options.format, 'skill');
  const files = skills.map((skill) => {
    const body = renderSkillBody(skill, bodyOptions);
    return {
      skillId: skill.id,
      content: renderTemplate(template, buildPerSkillContext(skill, body)),
    };
  });
  return { kind: 'per-skill-file', files };
}
