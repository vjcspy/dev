# CLI Best Practices for AI Agent Compatibility

Best practices for building devtools CLI commands (TypeScript, oclif) that AI agents can consume reliably.

---

## Response Design

### 1. Always Return Complete Data

AI agents should never need follow-up queries. Fetch all pages internally.

**Bad — forces agent to paginate:**

```typescript
// Don't expose pagination to the consumer
const data = await client.get('/items', { limit: '10', offset: String(offset) });
output(createPaginatedResponse({
  items: data.items,
  hasMore: data.next !== null,  // Agent must fetch more
  total: data.total,
  // ...
}), flags.format);
```

**Good — complete data in one call:**

```typescript
// Fetch all pages internally
const allItems = await fetchAllPages(client, '/items', { max: flags.max });
output(createPaginatedResponse({
  items: allItems,
  hasMore: false,      // Agent knows data is complete
  total: allItems.length,
  formatter: (item) => new MCPContent({ type: ContentType.JSON, data: item }),
  metadata: { resource_type: 'items' },
}), flags.format);
```

### 2. Token Optimization for Write Commands

Write operations (create, update, delete) should return minimal data. The agent just submitted the content — don't echo it back.

```typescript
// Strip content, keep only IDs and state
function filterWriteResponse(data: Record<string, unknown>): Record<string, unknown> {
  return {
    id: data.id,
    state: data.state,
    type: data.type,
    seq: data.seq,
    created_at: data.created_at,
  };
}
```

### 3. Rich Metadata

Include contextual metadata so agents understand what they received.

```typescript
new MCPResponse({
  success: true,
  content: [new MCPContent({ type: ContentType.JSON, data: result })],
  metadata: {
    resource_type: 'debate',         // What kind of data
    workspace: 'tinybots',           // Context
    message: 'Created successfully', // Human-readable status
  },
});
```

### 4. Safety Limits

Always include `--max` parameter for list commands to prevent runaway fetching.

```typescript
static flags = {
  max: Flags.integer({
    default: 500,
    description: 'Maximum items to fetch',
  }),
};
```

---

## Error Handling

### 1. Actionable Suggestions

Every error must tell the AI agent what to do next. The `suggestion` field is the most important part of an error response for agent recovery.

```typescript
// HTTPClient already maps HTTP status → actionable errors:
// 401 → { code: 'AUTH_FAILED', suggestion: 'Check your credentials' }
// 403 → { code: 'FORBIDDEN', suggestion: 'Check permissions' }
// 404 → { code: 'NOT_FOUND', suggestion: 'Verify the resource ID/path' }
```

For domain-specific errors, always include a suggestion:

```typescript
import { errorResponse, output } from '@aweave/cli-shared';

if (!flags['debate-id']) {
  output(
    errorResponse(
      'INVALID_INPUT',
      'Debate ID is required',
      'Use --debate-id <uuid> to specify the debate',
    ),
    flags.format,
  );
  this.exit(4);
}
```

### 2. Catch and Convert — Never Throw Raw

Command `run()` should catch `HTTPClientError` and convert to MCPResponse. Never let raw exceptions reach the caller.

```typescript
async run() {
  const { flags } = await this.parse(MyCommand);
  try {
    // ... command logic
    output(response, flags.format);
  } catch (error) {
    if (error instanceof HTTPClientError) {
      handleServerError(error, flags.format);
      // handleServerError calls process.exit() with appropriate code
    }
    throw error; // Unknown errors re-throw for oclif to handle
  }
}
```

### 3. Exit Codes

Use consistent exit codes so agents can programmatically detect failure type:

| Exit Code | Meaning | When |
|-----------|---------|------|
| 0 | Success | Normal completion |
| 2 | Not found | Resource doesn't exist |
| 3 | Server error | Network, timeout, HTTP 5xx |
| 4 | Invalid input | Bad flags, missing required data |
| 5 | Action not allowed | Wrong state, conflict |
| 6 | Auth failed | Missing/invalid credentials |

### 4. Validate Early

Check prerequisites before doing work. Fail fast with clear messages.

```typescript
async run() {
  const { flags } = await this.parse(MyCommand);

  // 1. Check credentials
  const apiKey = process.env.MY_API_KEY;
  if (!apiKey) {
    output(
      errorResponse('AUTH_FAILED', 'MY_API_KEY not set', 'Export MY_API_KEY=<key>'),
      flags.format,
    );
    this.exit(6);
  }

  // 2. Check services (if needed)
  if (AUTO_START) {
    const serviceResp = await ensureServices();
    if (!serviceResp.success) {
      output(serviceResp, flags.format);
      this.exit(3);
    }
  }

  // 3. Read content (if needed)
  const result = await readContent({ file: flags.file, content: flags.content, stdin: flags.stdin });
  if (result.error) {
    output(result.error, flags.format);
    this.exit(4);
  }

  // 4. Now do the actual work...
}
```

---

## Command Conventions

### 1. Flag Naming

Use kebab-case for multi-word flags. oclif auto-converts to camelCase in `flags` object.

```typescript
static flags = {
  'debate-id': Flags.string({ required: true, description: 'Debate UUID' }),
  'client-request-id': Flags.string({ description: 'Idempotency key' }),
  format: Flags.string({ default: 'json', options: ['json', 'markdown'] }),
};

// Access: flags['debate-id'], flags['client-request-id'], flags.format
```

### 2. Required Format Flag

Every command must have `--format json|markdown` with default `json`:

```typescript
static flags = {
  format: Flags.string({
    default: 'json',
    options: ['json', 'markdown'],
    description: 'Output format',
  }),
};
```

### 3. Credentials via Environment Variables

Never accept secrets as CLI flags (visible in shell history). Use env vars:

```typescript
const token = process.env.DEBATE_AUTH_TOKEN;
if (token) {
  // Use bearer token auth
  client = new HTTPClient({
    baseUrl: SERVER_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

### 4. Content Input Pattern

For commands that accept content (create, submit), support three sources:

```typescript
static flags = {
  file: Flags.string({ description: 'Path to content file' }),
  content: Flags.string({ description: 'Inline content' }),
  stdin: Flags.boolean({ description: 'Read content from stdin' }),
};

// Use readContent() helper from cli-shared
const result = await readContent({
  file: flags.file,
  content: flags.content,
  stdin: flags.stdin,
});
```

### 5. Idempotency Keys

For write operations, support `--client-request-id` for idempotency:

```typescript
static flags = {
  'client-request-id': Flags.string({ description: 'Idempotency key' }),
};

// Generate if not provided
const reqId = flags['client-request-id'] ?? randomUUID();
```

---

## Data Model Patterns

### TypeScript Interfaces + Factory Functions

```typescript
// src/lib/models.ts

export interface User {
  uuid: string;
  displayName: string;
}

export interface Resource {
  id: number;
  title: string;
  author: User;
  createdOn: string | null;
}

// Factory: API response → typed object
export function parseUser(data: Record<string, unknown>): User {
  return {
    uuid: (data.uuid as string) ?? '',
    displayName: (data.display_name as string) ?? 'Unknown',
  };
}

export function parseResource(data: Record<string, unknown>): Resource {
  const authorData = (data.author as Record<string, unknown>) ?? {};
  return {
    id: (data.id as number) ?? 0,
    title: (data.title as string) ?? '',
    author: parseUser(authorData),
    createdOn: (data.created_on as string) ?? null,
  };
}

// Serializer: typed object → JSON-safe dict
export function serializeResource(r: Resource): Record<string, unknown> {
  return {
    id: r.id,
    title: r.title,
    author: { uuid: r.author.uuid, display_name: r.author.displayName },
    created_on: r.createdOn,
  };
}
```

**Guidelines:**

- Use `parse*()` factory functions for API response → typed object
- Use `serialize*()` for typed object → JSON output (use snake_case keys matching API)
- Handle missing fields with defaults (`?? ''`, `?? 0`, `?? null`)
- Keep serialization keys in snake_case for consistency with MCP/API conventions

### Enums for State Values

```typescript
export enum TaskState {
  RESOLVED = 'RESOLVED',
  UNRESOLVED = 'UNRESOLVED',
}
```

---

## Pagination Strategy

### Auto-Fetch All Pages

CLI tools should fetch all pages internally. The consumer (AI agent) always gets complete data.

```typescript
async function fetchAllPages(
  client: HTTPClient,
  path: string,
  params?: Record<string, string>,
  maxItems = 500,
): Promise<{ items: Record<string, unknown>[]; total: number | null }> {
  const allItems: Record<string, unknown>[] = [];
  let total: number | null = null;
  let nextUrl: string | null = null;
  let first = true;

  while (true) {
    const data = first
      ? await client.get(path, { ...params, pagelen: '100' })
      : await client.getUrl(nextUrl!);
    first = false;

    const values = (data.values as Record<string, unknown>[]) ?? [];
    allItems.push(...values);

    total ??= (data.size as number) ?? null;
    nextUrl = (data.next as string) ?? null;

    if (!nextUrl || allItems.length >= maxItems) break;
  }

  return { items: allItems.slice(0, maxItems), total };
}
```

### Key Rules

1. `has_more` is **always `false`** in CLI responses — we fetch everything
2. Include `--max` flag as safety limit (default: 500)
3. Set `total_count` to actual total for agent context
4. Use efficient page sizes (`pagelen: 100`) to minimize requests

---

## Service Management Pattern

For commands that depend on backend services:

```typescript
// src/lib/config.ts
export const AUTO_START_SERVICES = process.env.AUTO_START_SERVICES !== 'false';
export const SERVER_URL = process.env.SERVER_URL ?? 'http://127.0.0.1:3456';

// src/lib/services.ts
import { checkPm2Process, startPm2, waitForHealthy, MCPResponse } from '@aweave/cli-shared';

export async function ensureServices(): Promise<MCPResponse> {
  const isRunning = await checkPm2Process('aweave-server');
  if (isRunning) return new MCPResponse({ success: true });

  await startPm2('/path/to/ecosystem.config.cjs');
  const healthy = await waitForHealthy('http://127.0.0.1:3456/health', 15_000);

  if (!healthy) {
    return new MCPResponse({
      success: false,
      error: new MCPError('TIMEOUT', 'Server failed to start', 'Check logs: pm2 logs aweave-server'),
    });
  }

  return new MCPResponse({ success: true });
}
```

---

## Testing Checklist

### Build

```bash
cd devtools && pnpm -r build    # All packages compile
```

### CLI Verification

```bash
aw <topic> --help               # Shows commands
aw <topic> <command> --help     # Shows flags
aw <topic> <command> | jq .     # Valid JSON
```

### Response Format

```bash
# Success response has correct shape
aw <topic> list | jq 'keys'
# Expected: ["content", "has_more", "metadata", "success", "total_count"]

# Error response has suggestion
aw <topic> get nonexistent-id | jq '.error'
# Expected: { "code": "NOT_FOUND", "message": "...", "suggestion": "..." }
```

### Markdown Format

```bash
aw <topic> list --format markdown
# Should render readable text
```
