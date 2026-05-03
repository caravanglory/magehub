import type { SupportedTool } from './skill.js';

export type OutputFormat = SupportedTool;

export interface RemoteRegistry {
  name: string;
  url: string;
  public_key?: string;
}

export interface SkillEntry {
  id: string;
  format?: OutputFormat;
}

export interface MageHubConfig {
  version: string;
  skills: SkillEntry[];
  format?: OutputFormat;
  output?: string;
  include_examples?: boolean;
  include_antipatterns?: boolean;
  custom_skills_path?: string;
  registries?: RemoteRegistry[];
  allowlist?: string[];
}
