# AGENTS.md -- MageHub

TypeScript CLI tool that packages Magento 2 AI coding skills as reusable context
files for multiple AI tools. Node.js 18+, ESM modules, Commander.js CLI framework.

## Build / Lint / Test Commands

```bash
npm install            # Install dependencies
npm run build          # Build with tsup (ESM, node18 target) -> dist/
npm run lint           # ESLint with TypeScript type-checking
npm run format:check   # Prettier check (no auto-fix)
npm run test           # Vitest -- run all tests (232 tests, 13 files)
npm run test:watch     # Vitest in watch mode
```

### Running a Single Test

```bash
# By file path
npx vitest run tests/unit/skill-loader.test.ts

# By test name pattern (-t flag)
npx vitest run -t "loadSkillFile"

# Combine file and name filter
npx vitest run tests/unit/renderer.test.ts -t "renderSkillListTable"
```

### Test Organization

- `tests/unit/` -- Unit tests (8 files), `tests/cli.test.ts` + `tests/core.test.ts` -- integration
- `tests/snapshot/` -- Snapshot tests, `tests/e2e/` -- smoke tests (all 7 output formats)
- `tests/helpers/` -- Shared fixtures and utilities, `tests/fixtures/` -- static test data

Coverage: V8 provider, covers `src/**/*.ts` (excludes `src/index.ts`, `src/types/**`).

## Code Style

### Formatting (Prettier + EditorConfig)

- Single quotes, semicolons, trailing commas (`all`)
- 2-space indentation, LF line endings, UTF-8
- Final newline required, no trailing whitespace
- Config: `.prettierrc`, `.editorconfig`

### Imports

Imports are organized in three groups separated by blank lines:

```ts
// 1. Node built-ins (always prefixed with `node:`)
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// 2. Third-party packages
import YAML from 'yaml';

// 3. Local project imports (relative paths with .js extension)
import type { Skill } from '../types/skill.js';
import { validateSkillSchema } from './schema-validator.js';
```

Key rules:

- **All local imports use `.js` extensions** (required by `NodeNext` module resolution)
- **No path aliases** -- all imports are relative
- **`import type` is enforced** for type-only imports (ESLint: `consistent-type-imports`)
- Mixed value+type imports use inline `type`: `import { loadSkills, type LoadedSkill } from './skill-loader.js';`

### TypeScript

- `strict: true` with ES2022 target, `NodeNext` module resolution
- **`interface` for object shapes; `type` for unions and derived types**
- Shared types live in `src/types/` with barrel re-exports via `src/types/index.ts`
- Module-specific types are co-located in the source file that defines them
- Generics are used sparingly and only where needed (e.g., `SchemaValidationResult<T>`)
- No `any` -- errors are typed as `unknown` and narrowed with `instanceof`

### Naming Conventions

| Element                | Convention    | Example                               |
| ---------------------- | ------------- | ------------------------------------- |
| Files and directories  | `kebab-case`  | `skill-loader.ts`, `src/core/`        |
| Interfaces             | `PascalCase`  | `Skill`, `MageHubConfig`              |
| Types                  | `PascalCase`  | `SkillCategory`, `OutputFormat`       |
| Classes                | `PascalCase`  | `CliError`, `SkillRegistry`           |
| Functions              | `camelCase`   | `createSkillRegistry`, `loadConfig`   |
| Variables / parameters | `camelCase`   | `effectiveRootDir`, `skillDirs`       |
| Module-level constants | `UPPER_SNAKE` | `DEFAULT_CONFIG_FILE`, `PROJECT_ROOT` |
| `as const` arrays      | `camelCase`   | `skillCategories`, `supportedTools`   |

### Exports

- **Named exports only** -- no `export default` in source code
- `export default` is only used in config files where idiomatically required (`tsup.config.ts`, `vitest.config.ts`)
- Barrel re-exports exist at `src/types/index.ts` and `src/core/index.ts`

### Command File Pattern

Every command file (`src/commands/`) has two exports: `runXxxCommand(options, rootDir?)` (async
implementation, exported for testability) and `registerXxxCommand(program)` (Commander.js
registration, always last in file).

### Error Handling

Layered error strategy -- do not use `try/catch` as the default:

1. **`CliError` class** (`src/utils/cli-error.ts`) -- custom error with `exitCode` property
2. **Top-level catch boundary** in `src/index.ts` -- catches all unhandled errors, extracts exit codes from `CliError`
3. **`.catch()` chaining** for expected failures (preferred over try/catch):
   ```ts
   const loaded = await loadConfig(rootDir).catch(() => {
     throw new CliError('Missing or invalid .magehub.yaml', 2);
   });
   ```
4. **`try/catch` only for low-level ops** where error type matters (ENOENT checks, YAML parse failures)
5. **Errors typed as `unknown`** in catch handlers, narrowed with `instanceof`
6. **`void` prefix** on fire-and-forget promises (enforced by `no-floating-promises`)

### Other Patterns

- `async/await` with explicit return types; `Promise.all` for parallel ops; `.catch()` for error conversion
- `.then()` is rare, used only for caching patterns
- Comments are extremely rare -- code is self-documenting via types and function names
- No JSDoc in source code (only in test helpers); no TODO comments or commented-out code
- File internal order: imports, types, constants, private helpers, exported public API

### Test Style

```ts
import { beforeEach, describe, expect, it } from 'vitest';

describe('module-name', () => {
  describe('functionName', () => {
    it('describes expected behavior', async () => {
      // Arrange, Act, Assert
    });
  });
});
```

- Top-level `describe` matches the module name
- Nested `describe` blocks match exported function names
- Test helpers like `createFixtureRepo` and `makeSkillYaml` are in `tests/helpers/`
- Schema validator cache must be cleared in `beforeEach`: `clearSchemaValidatorCache()`

## Key Design Decisions

- **No mutable global state** -- data flows through function args and return values
- **`SkillRegistry`** is the only stateful class; created fresh per command invocation
- **Schema validation** uses Ajv with a module-level `Map` cache for compiled validators
- **All filesystem ops** use `node:fs/promises` -- no synchronous I/O
- **YAML config** (`.magehub.yaml`) -- not JSON, not TOML
- **Format metadata** (`formats.ts`) separates per-skill-file vs single-file strategies, default paths, and auto-detection
- **Handlebars templates** for output format rendering (`templates/*.skill.hbs` for per-skill, `templates/*.hbs` for single-file)
- **Renderer/Writer split** -- renderer produces a `RenderArtifact`; writer persists it to disk
