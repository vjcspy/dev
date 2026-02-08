# Devtools

Unified TypeScript monorepo: CLI (`aw`), backend (NestJS), frontend (Next.js).

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- pm2 (`npm install -g pm2`)

## Quickstart

```bash
cd devtools
pnpm install
pnpm -r build
```

Install CLI globally:

```bash
cd common/cli
pnpm link --global
```

After install, run `aw --help` from anywhere.

## Start Services

```bash
pm2 start ecosystem.config.cjs

# Check status
pm2 list

# View logs
pm2 logs
```

| Service | Port | Description |
|---------|------|-------------|
| `aweave-server` | 3456 | NestJS API + WebSocket |
| `debate-web` | 3457 | Next.js debate monitoring UI |

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@aweave/cli` | `common/cli/` | Root CLI entrypoint (oclif) |
| `@aweave/cli-shared` | `common/cli-shared/` | Shared CLI libraries (MCP, HTTP, pm2) |
| `@aweave/cli-plugin-debate` | `common/cli-plugin-debate/` | `aw debate` commands |
| `@aweave/cli-plugin-docs` | `common/cli-plugin-docs/` | `aw docs` commands |
| `@aweave/cli-plugin-dashboard` | `common/cli-plugin-dashboard/` | `aw dashboard` commands |
| `server` | `common/server/` | Unified NestJS server |
| `@aweave/nestjs-debate` | `common/nestjs-debate/` | Debate backend module (Prisma + SQLite) |
| `@aweave/debate-machine` | `common/debate-machine/` | Debate state machine |
| `debate-web` | `common/debate-web/` | Next.js debate web UI |

## Development

```bash
# Build everything
pnpm -r build

# Build specific package
cd common/server && pnpm build

# Run server directly (dev)
cd common/server && node dist/main.js

# Run CLI (dev, without global install)
cd common/cli && ./bin/dev.js --help
```

## Documentation

- **Full Overview:** `devdocs/misc/devtools/OVERVIEW.md`
- **Server docs:** `devdocs/misc/devtools/common/server/OVERVIEW.md`
- **Debate module docs:** `devdocs/misc/devtools/common/nestjs-debate/OVERVIEW.md`
