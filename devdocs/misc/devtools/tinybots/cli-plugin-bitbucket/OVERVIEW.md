# Bitbucket CLI Plugin (`@aweave/cli-plugin-bitbucket`)

> **Source:** `devtools/tinybots/cli-plugin-bitbucket/`
> **Last Updated:** 2026-02-07

oclif plugin cung cấp topic `aw tinybots-bitbucket` — Bitbucket PR tools cho TinyBots domain. Plugin gọi trực tiếp Bitbucket REST API, auto-fetches all pages cho paginated endpoints.

## Purpose

Thay thế curl commands bằng structured CLI tool cho Bitbucket PR operations:

- **PR Info:** Get pull request details
- **Comments:** List all PR comments (auto-pagination, lấy tất cả pages)
- **Tasks:** List all PR tasks (auto-pagination)

**Cách tiếp cận:** Direct HTTP calls tới Bitbucket API v2.0:
- Authentication: Basic auth qua env vars (`BITBUCKET_USER`, `BITBUCKET_APP_PASSWORD`)
- Auto-pagination: Fetch tất cả pages (up to `--max` limit) trong 1 lần gọi
- Output: MCPResponse JSON format — consistent với tất cả `aw` commands

**Domain-specific:** Nằm trong `devtools/tinybots/` (không phải `devtools/common/`) vì chỉ dành cho TinyBots workspace. Đây là pattern cho domain-specific tools — future domains (nab, etc.) sẽ tạo plugin riêng tại `devtools/<domain>/cli-plugin-<name>/`.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│               @aweave/cli-plugin-bitbucket                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  commands/tinybots-bitbucket/                                │
│  ├── pr.ts                 ← Get PR details                  │
│  ├── comments.ts           ← List comments (auto-paginate)   │
│  └── tasks.ts              ← List tasks (auto-paginate)      │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  lib/                                                        │
│  ├── client.ts             ← BitbucketClient                 │
│  │   ├── getPR()             (HTTPClient wrapper)            │
│  │   ├── listPRComments()    Auto-pagination                 │
│  │   └── listPRTasks()       Returns MCPResponse             │
│  │                                                           │
│  └── models.ts             ← Data models + parsers           │
│      ├── PullRequest                                         │
│      ├── PRComment                                           │
│      ├── PRTask                                              │
│      └── BitbucketUser                                       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                        HTTPS                                 │
│            ┌───────────────────────────┐                     │
│            │  api.bitbucket.org/2.0    │                     │
│            └───────────────────────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

## Dependencies

| Package | Role |
|---------|------|
| `@oclif/core` | oclif Command class, Flags, Args |
| `@aweave/cli-shared` | MCPResponse, HTTPClient, output helper, createPaginatedResponse |

**External API:** Bitbucket REST API v2.0 (`https://api.bitbucket.org/2.0`)

## Commands

| Command | Description | Args |
|---------|-------------|------|
| `aw tinybots-bitbucket pr <repo> <pr_id>` | Get PR details | repo slug, PR ID |
| `aw tinybots-bitbucket comments <repo> <pr_id>` | List all comments | repo slug, PR ID |
| `aw tinybots-bitbucket tasks <repo> <pr_id>` | List all tasks | repo slug, PR ID |

### Common Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--workspace` | `tinybots` | Bitbucket workspace slug |
| `--format` | `json` | Output format: `json` or `markdown` |
| `--max` | `500` | Max items to fetch (comments/tasks only) |

### Auto-Pagination

Bitbucket API returns paginated responses (max 100 per page). Plugin automatically fetches all pages:

```
Page 1: GET /pullrequests/{id}/comments?pagelen=100
Page 2: GET {next_url}     ← from response.next
Page 3: GET {next_url}
... until no more pages or --max reached
```

All items aggregated into single MCPResponse with `total_count`.

## Configuration

| Env Var | Required | Description |
|---------|----------|-------------|
| `BITBUCKET_USER` | Yes | Bitbucket username/email |
| `BITBUCKET_APP_PASSWORD` | Yes | Bitbucket App Password |

> Create an App Password at: https://bitbucket.org/account/settings/app-passwords/

## Data Models

### PullRequest

| Field | Type | Source |
|-------|------|--------|
| `id` | number | `data.id` |
| `title` | string | `data.title` |
| `description` | string | `data.description` |
| `author` | BitbucketUser | `data.author` |
| `source_branch` | string | `data.source.branch.name` |
| `destination_branch` | string | `data.destination.branch.name` |
| `state` | `OPEN` \| `MERGED` \| `DECLINED` \| `SUPERSEDED` | `data.state` |
| `created_on` | string (ISO) | `data.created_on` |

### PRComment

| Field | Type | Source |
|-------|------|--------|
| `id` | number | `data.id` |
| `content` | string | `data.content.raw` |
| `author` | BitbucketUser | `data.user` |
| `file_path` | string? | `data.inline.path` (inline comments only) |
| `line` | number? | `data.inline.to` (inline comments only) |
| `created_on` | string? | `data.created_on` |

### PRTask

| Field | Type | Source |
|-------|------|--------|
| `id` | number | `data.id` |
| `content` | string | `data.content.raw` |
| `state` | `RESOLVED` \| `UNRESOLVED` | `data.state` |
| `comment_id` | number? | `data.comment.id` |
| `creator` | BitbucketUser? | `data.creator` |

## Project Structure

```
devtools/tinybots/cli-plugin-bitbucket/
├── package.json                    # @aweave/cli-plugin-bitbucket
├── tsconfig.json
└── src/
    ├── index.ts                    # (empty — oclif auto-discovers commands)
    ├── commands/
    │   └── tinybots-bitbucket/
    │       ├── pr.ts
    │       ├── comments.ts
    │       └── tasks.ts
    └── lib/
        ├── client.ts               # BitbucketClient (HTTPClient wrapper)
        └── models.ts               # PullRequest, PRComment, PRTask, parsers
```

## Development

```bash
cd devtools/tinybots/cli-plugin-bitbucket

# Build (requires cli-shared built first)
pnpm build

# Test (requires Bitbucket credentials)
export BITBUCKET_USER=user@example.com
export BITBUCKET_APP_PASSWORD=ATATTxxxxx
aw tinybots-bitbucket pr my-repo 123
aw tinybots-bitbucket comments my-repo 123 --max 50
```

## Related

- **Original Implementation Plan:** `devdocs/misc/devtools/tinybots/260130-bitbucket-cli-implementation.md`
- **Shared Utilities:** `devtools/common/cli-shared/`
- **Main CLI:** `devtools/common/cli/`
- **Architecture Plan:** `devdocs/misc/devtools/plans/260207-cli-oclif-refactor.md`
