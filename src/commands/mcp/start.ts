import type { Command } from 'commander';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { createSkillRegistry } from '../../core/skill-registry.js';
import { loadConfig, saveConfig, createDefaultConfig } from '../../core/config-manager.js';
import { renderGeneratedOutput } from '../../core/renderer.js';
import { info } from '../../utils/logger.js';

function mergeUnique(existing: string[], additions: string[]): string[] {
  return [...new Set([...existing, ...additions])];
}

async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'magehub',
    version: '0.1.0',
  });

  server.tool(
    'magehub_list_skills',
    'List all available Magento 2 AI coding skills',
    {
      category: z.string().optional().describe('Filter by category (module, api, admin, testing, performance, standards, etc.)'),
      format: z.enum(['table', 'json']).optional().default('json').describe('Output format'),
    },
    async ({ category, format }) => {
      try {
        const registry = await createSkillRegistry(process.cwd());
        const skills = registry.list(category as any);

        if (format === 'json') {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(skills, null, 2) }],
          };
        }

        const lines = skills.map((s) => `${s.id.padEnd(24)}${s.version.padEnd(10)}${s.description}`);
        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'magehub_search_skills',
    'Search available skills by keyword',
    {
      keyword: z.string().describe('Search keyword'),
      category: z.string().optional().describe('Filter by category'),
    },
    async ({ keyword, category }) => {
      try {
        const registry = await createSkillRegistry(process.cwd());
        const results = registry.search(keyword, category as any);

        if (results.length === 0) {
          return { content: [{ type: 'text' as const, text: `No skills matching "${keyword}".` }] };
        }

        const lines = results.map((s) => `${s.id.padEnd(24)}${s.description}`);
        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'magehub_show_skill',
    'Show detailed information about a specific skill',
    {
      skillId: z.string().describe('Skill identifier'),
    },
    async ({ skillId }) => {
      try {
        const registry = await createSkillRegistry(process.cwd());
        const skill = registry.getById(skillId);

        if (!skill) {
          return {
            content: [{ type: 'text' as const, text: `Unknown skill: ${skillId}` }],
            isError: true,
          };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(skill, null, 2) }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'magehub_install_skills',
    'Install skills into the project .magehub.yaml config',
    {
      skillIds: z.array(z.string()).describe('Skill IDs to install'),
    },
    async ({ skillIds }) => {
      try {
        const rootDir = process.cwd();
        const registry = await createSkillRegistry(rootDir);

        for (const id of skillIds) {
          if (!registry.getById(id)) {
            return {
              content: [{ type: 'text' as const, text: `Unknown skill: ${id}` }],
              isError: true,
            };
          }
        }

        let config;
        try {
          const loaded = await loadConfig(rootDir);
          config = loaded.config;
        } catch {
          config = createDefaultConfig();
        }

        config.skills = mergeUnique(config.skills, skillIds);
        await saveConfig(rootDir, config);

        return {
          content: [{ type: 'text' as const, text: `Installed skills: ${skillIds.join(', ')}\nUpdated .magehub.yaml` }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'magehub_remove_skills',
    'Remove skills from the project .magehub.yaml config',
    {
      skillIds: z.array(z.string()).describe('Skill IDs to remove'),
    },
    async ({ skillIds }) => {
      try {
        const rootDir = process.cwd();
        const loaded = await loadConfig(rootDir);
        const existing = new Set(loaded.config.skills);
        const missing = skillIds.filter((id: string) => !existing.has(id));

        if (missing.length > 0) {
          return {
            content: [{ type: 'text' as const, text: `Skills not installed: ${missing.join(', ')}` }],
            isError: true,
          };
        }

        loaded.config.skills = loaded.config.skills.filter((id: string) => !skillIds.includes(id));
        await saveConfig(rootDir, loaded.config);

        return {
          content: [{ type: 'text' as const, text: `Removed skills: ${skillIds.join(', ')}\nUpdated .magehub.yaml` }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'magehub_generate',
    'Generate AI tool context file from installed skills',
    {
      format: z.string().optional().describe('Output format: claude, cursor, codex, opencode, qoder, trae, markdown'),
      output: z.string().optional().describe('Output file path'),
      skills: z.array(z.string()).optional().describe('Specific skill IDs to include (defaults to all installed)'),
      examples: z.boolean().optional().default(true).describe('Include code examples'),
      antipatterns: z.boolean().optional().default(true).describe('Include anti-patterns'),
    },
    async ({ format, output, skills, examples, antipatterns }) => {
      try {
        const rootDir = process.cwd();
        const registry = await createSkillRegistry(rootDir);
        const loaded = await loadConfig(rootDir);

        const skillFormat = (format as any) ?? loaded.config.format ?? 'claude';
        const selectedSkillIds = skills ?? loaded.config.skills;

        if (selectedSkillIds.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No skills configured for generation. Install skills first.' }],
            isError: true,
          };
        }

        const selectedSkills = selectedSkillIds.map((id: string) => {
          const skill = registry.getById(id);
          if (!skill) {
            throw new Error(`Unknown skill: ${id}`);
          }
          return skill;
        });

        const outputPath = output ?? loaded.config.output ?? rootDir + '/' + (skillFormat === 'claude' ? 'CLAUDE.md' : `${skillFormat}.md`);
        const generated = await renderGeneratedOutput(selectedSkills, {
          format: skillFormat,
          includeExamples: examples,
          includeAntipatterns: antipatterns,
          rootDir,
        });

        const { writeUtf8 } = await import('../../utils/fs.js');
        await writeUtf8(outputPath, generated);

        return {
          content: [{ type: 'text' as const, text: `Generated: ${outputPath}` }],
        };
      } catch (error: unknown) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  info('MageHub MCP server starting on stdio...');
  await server.connect(transport);
  info('MageHub MCP server connected');
}

export function registerMcpStartCommand(program: Command): void {
  program
    .command('mcp:start')
    .alias('mcp')
    .description('Start MageHub as an MCP server for AI agents')
    .action(async () => {
      await startMcpServer();
    });
}
