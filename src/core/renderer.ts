import { readFile } from 'node:fs/promises';

import type {
  MageHubConfig,
  OutputFormat,
  SkillEntry,
} from '../types/config.js';
import type { Skill } from '../types/skill.js';
import { renderTemplate } from '../utils/template.js';
import { getFormatMetadata } from './formats.js';
import {
  getPackageVersion,
  resolveBundledTemplatePath,
} from './runtime-assets.js';

export interface RenderOptions {
  format: OutputFormat;
  includeExamples: boolean;
  includeAntipatterns: boolean;
  skillEntries?: SkillEntry[];
  templateVariant?: string;
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

function hasItems<T>(items: T[] | undefined): items is T[] {
  return items !== undefined && items.length > 0;
}

function appendStringListSection(
  sections: string[],
  heading: string,
  items: string[] | undefined,
): void {
  if (!hasItems(items)) {
    return;
  }

  sections.push('', heading, '');
  sections.push(...items.map((item) => `- ${item}`));
}

function appendNumberedListSection(
  sections: string[],
  heading: string,
  items: string[] | undefined,
): void {
  if (!hasItems(items)) {
    return;
  }

  sections.push('', heading, '');
  items.forEach((item, index) => {
    sections.push(`${index + 1}. ${item}`);
  });
}

function appendActivationSection(sections: string[], skill: Skill): void {
  const hasActivation =
    hasItems(skill.use_when) ||
    hasItems(skill.do_not_use_when) ||
    hasItems(skill.required_inputs);

  if (!hasActivation) {
    return;
  }

  sections.push('### Activation');
  appendStringListSection(sections, '#### Use When', skill.use_when);
  appendStringListSection(
    sections,
    '#### Do Not Use When',
    skill.do_not_use_when,
  );
  appendStringListSection(
    sections,
    '#### Required Inputs',
    skill.required_inputs,
  );
}

function appendGuardrails(sections: string[], skill: Skill): void {
  if (!hasItems(skill.guardrails)) {
    return;
  }

  sections.push('', '### Guardrails', '');
  for (const guardrail of skill.guardrails) {
    const approval =
      guardrail.approval_required === true ? ' (approval required)' : '';
    sections.push(`- ${guardrail.rule}${approval}`);
  }
}

function inferTemplateLanguage(filePath: string): string {
  if (filePath.endsWith('.php')) return 'php';
  if (filePath.endsWith('.xml')) return 'xml';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.graphqls') || filePath.endsWith('.graphql')) {
    return 'graphql';
  }
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) return 'yaml';
  if (filePath.endsWith('.sh')) return 'bash';
  return 'text';
}

function formatTemplateDisplayPath(filePath: string): string {
  return filePath.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, '<$1>');
}

function appendFileTemplates(sections: string[], skill: Skill): void {
  if (!hasItems(skill.files)) {
    return;
  }

  sections.push('', '### File Templates', '');
  for (const file of skill.files) {
    sections.push(`#### ${formatTemplateDisplayPath(file.path)}`, '');
    sections.push('Path template:', '', '```text', file.path, '```', '');
    if (file.description !== undefined) {
      sections.push(file.description, '');
    }
    if (file.template !== undefined) {
      const language = inferTemplateLanguage(file.path);
      sections.push('```' + language, file.template.trim(), '```', '');
    }
  }
}

function appendFreshness(sections: string[], skill: Skill): void {
  if (skill.freshness === undefined) {
    return;
  }

  const lines: string[] = [];
  if (skill.freshness.last_reviewed !== undefined) {
    lines.push(`- Last reviewed: ${skill.freshness.last_reviewed}`);
  }
  if (hasItems(skill.freshness.sources)) {
    lines.push(`- Sources to re-check: ${skill.freshness.sources.join(', ')}`);
  }

  if (lines.length > 0) {
    sections.push('', '### Freshness', '', ...lines);
  }
}

function renderSkillBody(
  skill: Skill,
  options: Pick<RenderOptions, 'includeExamples' | 'includeAntipatterns'>,
): string {
  const sections: string[] = [];

  appendActivationSection(sections, skill);
  appendNumberedListSection(sections, '### Workflow', skill.workflow);
  appendGuardrails(sections, skill);
  appendStringListSection(sections, '### Verification', skill.verification);
  appendStringListSection(
    sections,
    '### Output Contract',
    skill.output_contract,
  );

  if (sections.length > 0) {
    sections.push('');
  }

  sections.push(skill.instructions.trim());

  if ((skill.conventions?.length ?? 0) > 0) {
    sections.push('', '### Conventions', '');
    for (const convention of skill.conventions ?? []) {
      sections.push(`- ${convention.rule}`);
      if (convention.example !== undefined) {
        sections.push(`  Example: ${convention.example}`);
      }
      if (convention.rationale !== undefined) {
        sections.push(`  Rationale: ${convention.rationale}`);
      }
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
      if (antiPattern.solution !== undefined) {
        sections.push(`  Solution: ${antiPattern.solution}`);
      }
    }
  }

  appendFileTemplates(sections, skill);

  if ((skill.references?.length ?? 0) > 0) {
    sections.push('', '### References', '');
    for (const reference of skill.references ?? []) {
      sections.push(`- [${reference.title}](${reference.url})`);
    }
  }

  appendFreshness(sections, skill);

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
      if (convention.example !== undefined) {
        lines.push(`    Example: ${convention.example}`);
      }
      if (convention.rationale !== undefined) {
        lines.push(`    Rationale: ${convention.rationale}`);
      }
    }
  }

  if ((skill.workflow?.length ?? 0) > 0) {
    lines.push('', `Workflow (${(skill.workflow ?? []).length}):`);
    for (const step of skill.workflow ?? []) {
      lines.push(`  - ${step}`);
    }
  }

  if ((skill.guardrails?.length ?? 0) > 0) {
    lines.push('', `Guardrails (${(skill.guardrails ?? []).length}):`);
    for (const guardrail of skill.guardrails ?? []) {
      const approval =
        guardrail.approval_required === true ? ' (approval required)' : '';
      lines.push(`  - ${guardrail.rule}${approval}`);
    }
  }

  if ((skill.verification?.length ?? 0) > 0) {
    lines.push('', `Verification (${(skill.verification ?? []).length}):`);
    for (const item of skill.verification ?? []) {
      lines.push(`  - ${item}`);
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
      if (antiPattern.solution !== undefined) {
        lines.push(`    Solution: ${antiPattern.solution}`);
      }
    }
  }

  if ((skill.files?.length ?? 0) > 0) {
    lines.push('', `File templates (${(skill.files ?? []).length}):`);
    for (const file of skill.files ?? []) {
      lines.push(`  - ${file.path}`);
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
    magehub_version: getPackageVersion(),
  };
}

function quoteYamlString(value: string): string {
  return JSON.stringify(value) ?? '""';
}

function buildPerSkillContext(
  skill: Skill,
  body: string,
  installedVersion?: string,
): Record<string, unknown> {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    descriptionYaml: quoteYamlString(skill.description),
    version: skill.version,
    category: skill.category,
    tags: skill.tags ?? [],
    body,
    installed_version: installedVersion ?? skill.version,
    magehub_version: getPackageVersion(),
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
  const entryMap = new Map((options.skillEntries ?? []).map((e) => [e.id, e]));
  const template = await loadTemplate(
    options.format,
    options.templateVariant ?? 'skill',
  );
  const files = skills.map((skill) => {
    const body = renderSkillBody(skill, bodyOptions);
    const entry = entryMap.get(skill.id);
    return {
      skillId: skill.id,
      content: renderTemplate(
        template,
        buildPerSkillContext(skill, body, entry?.installed_version),
      ),
    };
  });
  return { kind: 'per-skill-file', files };
}
