import { mkdtemp, mkdir, writeFile, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Path to the real project root (for accessing schemas, templates, and skills).
 */
export const PROJECT_ROOT = path.resolve(import.meta.dirname, '../..');

/**
 * Minimal valid skill YAML string.
 */
export function makeSkillYaml(
  overrides: {
    id?: string;
    name?: string;
    version?: string;
    category?: string;
    description?: string;
    instructions?: string;
    instructions_file?: string;
    tags?: string[];
    use_when?: string[];
    do_not_use_when?: string[];
    required_inputs?: string[];
    workflow?: string[];
    guardrails?: Array<{ rule: string; approval_required?: boolean }>;
    verification?: string[];
    output_contract?: string[];
    conventions?: Array<{ rule: string }>;
    examples?: Array<{
      title: string;
      code?: string;
      code_file?: string;
      language?: string;
    }>;
    anti_patterns?: Array<{ pattern: string; problem: string }>;
    files?: Array<{ path: string; description?: string; template?: string }>;
    references?: Array<{ title: string; url: string }>;
    freshness?: { last_reviewed?: string; sources?: string[] };
    compatibility?: string[];
  } = {},
): string {
  const id = overrides.id ?? 'test-skill';
  const name = overrides.name ?? 'Test Skill';
  const version = overrides.version ?? '1.0.0';
  const category = overrides.category ?? 'module';
  const description = overrides.description ?? 'A test skill';
  const instructions = overrides.instructions ?? '### Test\n\nDo something.';
  const instructionsFile = overrides.instructions_file;
  const tags = overrides.tags ?? ['test'];
  const useWhen = overrides.use_when;
  const doNotUseWhen = overrides.do_not_use_when;
  const requiredInputs = overrides.required_inputs;
  const workflow = overrides.workflow;
  const guardrails = overrides.guardrails;
  const verification = overrides.verification;
  const outputContract = overrides.output_contract;
  const conventions = overrides.conventions ?? [{ rule: 'Be consistent' }];
  const examples = overrides.examples ?? [
    { title: 'Example', code: 'echo "hi"', language: 'bash' },
  ];
  const anti_patterns = overrides.anti_patterns ?? [
    { pattern: 'Bad thing', problem: 'Causes issues' },
  ];
  const files = overrides.files;
  const references = overrides.references ?? [
    { title: 'Docs', url: 'https://example.com' },
  ];
  const freshness = overrides.freshness;
  const compatibility = overrides.compatibility ?? ['claude'];

  const lines: string[] = [
    `id: ${id}`,
    `name: ${name}`,
    `version: "${version}"`,
    `category: ${category}`,
    `description: ${description}`,
    'tags:',
    ...tags.map((t) => `  - ${t}`),
    ...(useWhen !== undefined
      ? ['use_when:', ...useWhen.map((value) => `  - ${value}`)]
      : []),
    ...(doNotUseWhen !== undefined
      ? ['do_not_use_when:', ...doNotUseWhen.map((value) => `  - ${value}`)]
      : []),
    ...(requiredInputs !== undefined
      ? ['required_inputs:', ...requiredInputs.map((value) => `  - ${value}`)]
      : []),
    ...(instructionsFile !== undefined
      ? [`instructions_file: ${instructionsFile}`]
      : [`instructions: |`, ...instructions.split('\n').map((l) => `  ${l}`)]),
    ...(workflow !== undefined
      ? ['workflow:', ...workflow.map((value) => `  - ${value}`)]
      : []),
    ...(guardrails !== undefined
      ? [
          'guardrails:',
          ...guardrails.map((guardrail) =>
            [
              `  - rule: "${guardrail.rule}"`,
              guardrail.approval_required !== undefined
                ? `    approval_required: ${guardrail.approval_required}`
                : undefined,
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ]
      : []),
    ...(verification !== undefined
      ? ['verification:', ...verification.map((value) => `  - ${value}`)]
      : []),
    ...(outputContract !== undefined
      ? ['output_contract:', ...outputContract.map((value) => `  - ${value}`)]
      : []),
    'conventions:',
    ...conventions.map((c) => `  - rule: "${c.rule}"`),
    'examples:',
    ...examples.map((e) =>
      [
        `  - title: "${e.title}"`,
        e.language ? `    language: ${e.language}` : undefined,
        ...(e.code_file !== undefined
          ? [`    code_file: ${e.code_file}`]
          : [
              `    code: |`,
              ...(e.code ?? '').split('\n').map((l) => `      ${l}`),
            ]),
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    'anti_patterns:',
    ...anti_patterns.map(
      (a) => `  - pattern: "${a.pattern}"\n    problem: "${a.problem}"`,
    ),
    ...(files !== undefined
      ? [
          'files:',
          ...files.map((file) =>
            [
              `  - path: "${file.path}"`,
              file.description !== undefined
                ? `    description: "${file.description}"`
                : undefined,
              file.template !== undefined
                ? [
                    '    template: |',
                    ...file.template.split('\n').map((line) => `      ${line}`),
                  ].join('\n')
                : undefined,
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ]
      : []),
    'references:',
    ...references.map((r) => `  - title: "${r.title}"\n    url: ${r.url}`),
    ...(freshness !== undefined
      ? [
          'freshness:',
          freshness.last_reviewed !== undefined
            ? `  last_reviewed: "${freshness.last_reviewed}"`
            : undefined,
          freshness.sources !== undefined
            ? [
                '  sources:',
                ...freshness.sources.map((source) => `    - ${source}`),
              ].join('\n')
            : undefined,
        ].filter((value): value is string => value !== undefined)
      : []),
    'compatibility:',
    ...compatibility.map((c) => `  - ${c}`),
  ];

  return lines.join('\n') + '\n';
}

/**
 * Create a minimal config YAML string.
 */
export function makeConfigYaml(
  overrides: {
    version?: string;
    skills?: Array<string | { id: string; format?: string }>;
    format?: string;
    include_examples?: boolean;
    include_antipatterns?: boolean;
    custom_skills_path?: string;
  } = {},
): string {
  const version = overrides.version ?? '1';
  const skills = overrides.skills ?? [];
  const format = overrides.format ?? 'claude';

  const skillLines = skills.map((s) => {
    if (typeof s === 'string') {
      return `  - id: ${s}`;
    }
    if (s.format !== undefined) {
      return `  - id: ${s.id}\n    format: ${s.format}`;
    }
    return `  - id: ${s.id}`;
  });

  const lines: string[] = [
    `version: "${version}"`,
    'skills:',
    ...(skillLines.length > 0 ? skillLines : ['  []']),
    `format: ${format}`,
  ];

  if (overrides.include_examples !== undefined) {
    lines.push(`include_examples: ${overrides.include_examples}`);
  }
  if (overrides.include_antipatterns !== undefined) {
    lines.push(`include_antipatterns: ${overrides.include_antipatterns}`);
  }
  if (overrides.custom_skills_path !== undefined) {
    lines.push(`custom_skills_path: "${overrides.custom_skills_path}"`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Create a temporary fixture repo with real schemas and templates from the project,
 * plus optional skill and config files.
 */
export async function createFixtureRepo(
  options: {
    skills?: Array<{
      category: string;
      id: string;
      yaml: string;
      extraFiles?: Array<{ relativePath: string; content: string }>;
    }>;
    config?: string;
    templates?: boolean;
  } = {},
): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'magehub-test-'));

  // Copy real schemas
  await mkdir(path.join(rootDir, 'schema'), { recursive: true });
  await cp(
    path.join(PROJECT_ROOT, 'schema', 'skill.schema.json'),
    path.join(rootDir, 'schema', 'skill.schema.json'),
  );
  await cp(
    path.join(PROJECT_ROOT, 'schema', 'config.schema.json'),
    path.join(rootDir, 'schema', 'config.schema.json'),
  );

  // Copy real templates
  if (options.templates !== false) {
    await cp(
      path.join(PROJECT_ROOT, 'templates'),
      path.join(rootDir, 'templates'),
      { recursive: true },
    );
  }

  // Create skill directories
  await mkdir(path.join(rootDir, 'skills'), { recursive: true });

  if (options.skills) {
    for (const skill of options.skills) {
      const skillDir = path.join(rootDir, 'skills', skill.category, skill.id);
      await mkdir(skillDir, { recursive: true });
      await writeFile(path.join(skillDir, 'skill.yaml'), skill.yaml, 'utf8');
      if (skill.extraFiles) {
        for (const extra of skill.extraFiles) {
          const extraPath = path.join(skillDir, extra.relativePath);
          await mkdir(path.dirname(extraPath), { recursive: true });
          await writeFile(extraPath, extra.content, 'utf8');
        }
      }
    }
  }

  // Write config
  if (options.config) {
    await writeFile(
      path.join(rootDir, '.magehub.yaml'),
      options.config,
      'utf8',
    );
  }

  return rootDir;
}
