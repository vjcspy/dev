---
name: devtools-cli-builder
description: Guide for building oclif CLI plugins and NestJS backend modules in the devtools TypeScript monorepo. All CLI outputs follow MCP-like response format for AI agent compatibility. Use when creating CLI commands, adding oclif plugins, building backend features, or integrating external APIs in devtools/.
---

# Devtools CLI Builder

## Overview

Build CLI tools and backend modules in the `devtools/` TypeScript monorepo. The CLI (`aw <command>`) uses oclif with a response format inspired by MCP (Model Context Protocol), designed so AI agents can consume CLI output as if it were MCP tool responses.

**Core Principles:**

1. **MCP-Like by Design** — CLI is NOT an MCP server, but mirrors MCP conventions in response format, error handling, input schemas, and tool descriptions. Standards live in `@aweave/cli-shared`; all plugins inherit.
2. **oclif Plugin System** — Each domain ships commands as an oclif plugin (`@aweave/cli-plugin-<name>`), auto-discovered at startup.
3. **Shared Foundation** — `@aweave/cli-shared` is a pure utility library (zero framework deps) providing MCP models, HTTP client, output helpers, and pm2 management.
4. **No Cyclic Dependencies** — cli-shared is a leaf dependency. Plugins never import each other or the main CLI package.

---

## Architecture

### Dependency Graph

```
@aweave/cli-shared (pure utilities — zero external deps)
     ↑                    ↑
     |                    |
@aweave/cli          @aweave/cli-plugin-*
(oclif main app)     (oclif plugins)
     |
     └── declares plugins in oclif.plugins config

@aweave/server (NestJS — port 3456)
     ↑
     |
@aweave/nestjs-<feature> (backend modules)
```

### Package Map

| Package | npm name | Location | Role |
|---------|----------|----------|------|
| CLI Shared | `@aweave/cli-shared` | `devtools/common/cli-shared/` | Pure utility library (MCP, HTTP, helpers) |
| CLI Main | `@aweave/cli` | `devtools/common/cli/` | oclif app, plugin declarations, `aw` binary |
| Plugins | `@aweave/cli-plugin-<name>` | `devtools/<domain>/cli-plugin-<name>/` | Domain command sets |
| Server | `@aweave/server` | `devtools/common/server/` | Unified NestJS server |
| Backend Modules | `@aweave/nestjs-<name>` | `devtools/common/nestjs-<name>/` | NestJS feature modules |

### File-Based Command Routing

oclif auto-discovers commands from file paths:

```
src/commands/<topic>/create.ts         → aw <topic> create
src/commands/<topic>/list.ts           → aw <topic> list
src/commands/<topic>/services/start.ts → aw <topic> services start
```

---

## MCP-Like Response Standard

### How the CLI Maps to MCP Concepts

| MCP Concept | CLI Equivalent | Where |
|-------------|---------------|-------|
| Tool name | oclif command path | `aw debate create` |
| Tool description | `static description` on Command class | Each command file |
| Input schema | `static flags` / `static args` with types | oclif flag definitions |
| Tool response | `MCPResponse` JSON output | `@aweave/cli-shared` |
| Error response | `MCPError` with code/message/suggestion | `@aweave/cli-shared` |
| Pagination | `has_more`, `next_offset`, `total_count` | `createPaginatedResponse()` |

### Response Contract

**Success:**

```json
{
  "success": true,
  "content": [{ "type": "json", "data": { "id": "abc", "title": "..." } }],
  "metadata": { "resource_type": "debate", "message": "Created" },
  "has_more": false,
  "total_count": 1
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Debate not found",
    "suggestion": "Verify the debate ID is correct"
  }
}
```

### Key Exports from `@aweave/cli-shared`

| Export | Purpose |
|--------|---------|
| `MCPResponse` | Main response wrapper — `toDict()`, `toJSON()`, `toMarkdown()` |
| `MCPContent` | Content item — `{ type, text?, data? }` |
| `MCPError` | Error detail — `{ code, message, suggestion? }` |
| `ContentType` | Enum: `TEXT`, `JSON` |
| `createPaginatedResponse()` | Helper for list responses with pagination metadata |
| `HTTPClient` | fetch-based HTTP client with error mapping |
| `HTTPClientError` | Typed error with `code`, `message`, `suggestion` |
| `output()` | Print MCPResponse as JSON or Markdown |
| `errorResponse()` | Shorthand to create error MCPResponse |
| `handleServerError()` | Output error + `process.exit()` with appropriate code |
| `readContent()` | Read from `--file`, `--content`, or `--stdin` |
| `startPm2()`, `stopPm2()`, `checkPm2Process()`, `waitForHealthy()` | pm2 service management |

### Error Codes & Exit Codes

| Code | Meaning | Exit Code |
|------|---------|-----------|
| `NOT_FOUND` | Resource not found (404) | 2 |
| `TIMEOUT` / `NETWORK_ERROR` | Server unreachable | 3 |
| `INVALID_INPUT` | Bad request / validation | 4 |
| `ACTION_NOT_ALLOWED` | Conflict / wrong state | 5 |
| `AUTH_FAILED` / `FORBIDDEN` | Authentication/authorization | 6 |
| `HTTP_<status>` | Other HTTP errors | 3 |

---

## Creating a New CLI Plugin

### Step 1: Scaffold Package

```
devtools/<domain>/cli-plugin-<name>/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── commands/
    │   └── <topic>/
    │       ├── list.ts
    │       └── create.ts
    └── lib/
        ├── config.ts
        └── helpers.ts
```

Common-domain plugins go in `devtools/common/cli-plugin-<name>/`.

### Step 2: package.json

```json
{
  "name": "@aweave/cli-plugin-<name>",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc" },
  "oclif": {
    "commands": "./dist/commands",
    "topicSeparator": " "
  },
  "dependencies": {
    "@aweave/cli-shared": "workspace:*",
    "@oclif/core": "^4.2.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "typescript": "^5.7.3"
  }
}
```

### Step 3: tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2023",
    "declaration": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "incremental": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "removeComments": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 4: Implement a Command

```typescript
// src/commands/<topic>/list.ts
import {
  ContentType,
  createPaginatedResponse,
  handleServerError,
  HTTPClient,
  HTTPClientError,
  MCPContent,
  output,
} from '@aweave/cli-shared';
import { Command, Flags } from '@oclif/core';

export class TopicList extends Command {
  static description = 'List all resources';

  static flags = {
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
    max: Flags.integer({
      default: 500,
      description: 'Maximum items to fetch',
    }),
  };

  async run() {
    const { flags } = await this.parse(TopicList);

    try {
      const client = new HTTPClient({ baseUrl: 'http://127.0.0.1:3456' });
      const data = (await client.get('/resources')) as {
        items: Record<string, unknown>[];
        total: number;
      };

      const response = createPaginatedResponse({
        items: data.items,
        total: data.total,
        hasMore: false, // Always false — CLI fetches all data
        formatter: (item) =>
          new MCPContent({ type: ContentType.JSON, data: item }),
        metadata: { resource_type: 'resources' },
      });

      output(response, flags.format);
    } catch (error) {
      if (error instanceof HTTPClientError) {
        handleServerError(error, flags.format);
      }
      throw error;
    }
  }
}
```

### Step 5: Register Plugin

1. Add to `devtools/pnpm-workspace.yaml`:

```yaml
packages:
  - '<domain>/cli-plugin-<name>'
```

2. Add to `devtools/common/cli/package.json`:

```json
{
  "dependencies": {
    "@aweave/cli-plugin-<name>": "workspace:*"
  },
  "oclif": {
    "plugins": ["@aweave/cli-plugin-<name>"]
  }
}
```

3. Build and verify:

```bash
cd devtools && pnpm install && pnpm -r build
cd common/cli && pnpm link --global
aw <topic> --help
```

---

## Creating a New Backend Module

When a CLI plugin needs server-side logic (REST API, WebSocket, database):

### Package Structure

```
devtools/common/nestjs-<feature>/
├── package.json          # @aweave/nestjs-<feature>
├── tsconfig.json
└── src/
    ├── <feature>.module.ts
    ├── <feature>.controller.ts
    ├── <feature>.service.ts
    └── index.ts           # exports NestJS module
```

### Integration

1. Add to `pnpm-workspace.yaml`
2. Add as dependency of `@aweave/server`
3. Import in `devtools/common/server/src/app.module.ts`
4. CLI plugin calls server endpoints via `HTTPClient` from `@aweave/cli-shared`

**Full NestJS patterns:** `devdocs/misc/devtools/common/server/OVERVIEW.md`

---

## Shared Code Organization

### Decision Matrix

| Code Type | Location | Example |
|-----------|----------|---------|
| MCP response models | `cli-shared/src/mcp/` | `MCPResponse`, `MCPContent` |
| HTTP client | `cli-shared/src/http/` | `HTTPClient`, `HTTPClientError` |
| Output/content helpers | `cli-shared/src/helpers/` | `output()`, `readContent()` |
| pm2 utilities | `cli-shared/src/services/` | `startPm2()`, `checkHealth()` |
| Cross-plugin domain logic | New `@aweave/<name>` package | `@aweave/debate-machine` |
| Plugin config | Plugin `src/lib/config.ts` | Env vars, defaults |
| Plugin helpers | Plugin `src/lib/helpers.ts` | `getClient()`, `filterResponse()` |
| Plugin models | Plugin `src/lib/models.ts` | Domain interfaces/types |

### Rules

1. **`cli-shared` must be generic** — no domain logic, no oclif dependency, zero external deps
2. **New common package** — if logic is shared across plugins but too specific for cli-shared, create `@aweave/<name>` in `devtools/common/`
3. **Never plugin-to-plugin imports** — shared code goes up to cli-shared or a new common package
4. **Never plugin-to-cli-main imports** — only cli-main depends on plugins (via oclif config)

---

## Interactive Terminal UI (Ink v6)

For commands with interactive terminal UI (dashboards, real-time monitoring), use Ink v6 + React 19. The plugin **must be ESM** (`"type": "module"`) and follows different patterns from standard CJS plugins.

**Reference implementation:** `devdocs/misc/devtools/common/cli-plugin-dashboard/OVERVIEW.md`

Key differences: ESM package config, dynamic `import()` for Ink/React, no dev mode (must build first), async-only data fetching.

---

## Checklist

### Before Implementation

- [ ] Read `devdocs/misc/devtools/OVERVIEW.md` for architecture context
- [ ] Check existing exports from `@aweave/cli-shared` — don't duplicate
- [ ] Decide: CLI-only or CLI + Backend?

### CLI Plugin

- [ ] Package created with correct `oclif` config in package.json
- [ ] All commands output `MCPResponse` via `output()` helper
- [ ] `--format json|markdown` flag on every command (default: `json`)
- [ ] Error handling: `HTTPClientError` → `handleServerError()`
- [ ] Credentials via environment variables (never CLI flags — shell history risk)
- [ ] List commands auto-fetch all pages (`has_more: false`)
- [ ] Write commands return minimal data — IDs, state only (token optimization)
- [ ] Plugin registered in `pnpm-workspace.yaml` + `cli/package.json` oclif.plugins

### Backend Module (if needed)

- [ ] NestJS module created with controller + service
- [ ] Added as dependency of `@aweave/server`
- [ ] Imported in `app.module.ts`
- [ ] CLI plugin calls endpoints via `HTTPClient`

### Verification

- [ ] `pnpm -r build` — no compilation errors
- [ ] `aw <topic> --help` — shows commands
- [ ] JSON output is valid MCPResponse format
- [ ] Error cases return `{ success: false, error: { code, message, suggestion } }`

---

## Reference

- **Best practices:** [cli_best_practices.md](reference/cli_best_practices.md)
- **Full example (debate plugin):** [example_implementation.md](reference/example_implementation.md)
- **DevTools overview:** `devdocs/misc/devtools/OVERVIEW.md`
- **CLI shared library:** `devdocs/misc/devtools/common/cli-shared/OVERVIEW.md`
- **Server patterns:** `devdocs/misc/devtools/common/server/OVERVIEW.md`
- **Ink/Dashboard patterns:** `devdocs/misc/devtools/common/cli-plugin-dashboard/OVERVIEW.md`
- **MCP server guide (if converting):** `devdocs/agent/skills/common/mcp-builder/SKILL.md`
