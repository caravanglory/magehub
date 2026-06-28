export const skillCategories = [
  'module',
  'api',
  'admin',
  'frontend',
  'hyva',
  'testing',
  'performance',
  'upgrade',
  'devops',
  'standards',
] as const;

export const supportedTools = ['claude', 'opencode', 'codex', 'qoder'] as const;

export type SkillCategory = (typeof skillCategories)[number];
export type SupportedTool = (typeof supportedTools)[number];

export interface SkillConvention {
  rule: string;
  example?: string;
  rationale?: string;
}

export interface SkillExample {
  title: string;
  description?: string;
  code: string;
  language?: string;
}

export interface RawSkillExample {
  title: string;
  description?: string;
  code?: string;
  code_file?: string;
  language?: string;
}

export interface SkillAntiPattern {
  pattern: string;
  problem: string;
  solution?: string;
}

export interface SkillGuardrail {
  rule: string;
  approval_required?: boolean;
}

export interface SkillFileTemplate {
  path: string;
  template?: string;
  description?: string;
}

export interface SkillFreshness {
  last_reviewed?: string;
  sources?: string[];
}

export interface SkillReference {
  title: string;
  url: string;
}

export interface Skill {
  id: string;
  name: string;
  version: string;
  category: SkillCategory;
  description: string;
  tags?: string[];
  magento_versions?: string[];
  dependencies?: string[];
  use_when?: string[];
  do_not_use_when?: string[];
  required_inputs?: string[];
  instructions: string;
  workflow?: string[];
  guardrails?: SkillGuardrail[];
  verification?: string[];
  output_contract?: string[];
  conventions?: SkillConvention[];
  examples?: SkillExample[];
  anti_patterns?: SkillAntiPattern[];
  files?: SkillFileTemplate[];
  references?: SkillReference[];
  freshness?: SkillFreshness;
  compatibility?: SupportedTool[];
}

export type RawSkill = Omit<
  Skill,
  'instructions' | 'examples' | 'compatibility'
> & {
  instructions?: string;
  instructions_file?: string;
  examples?: RawSkillExample[];
  compatibility?: LegacySupportedTool[];
};
