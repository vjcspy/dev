# Complete Example: Debate CLI Plugin

This document shows a complete oclif plugin implementation based on `@aweave/cli-plugin-debate` — the most complex plugin with 11 commands, service management, and server interaction.

---

## Directory Structure

```
devtools/common/cli-plugin-debate/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # Plugin entry (oclif auto-discovery)
    ├── lib/
    │   ├── config.ts                     # Environment config
    │   ├── helpers.ts                    # getClient(), filterWriteResponse()
    │   └── services.ts                   # Service management (pm2 + health)
    └── commands/
        └── debate/
            ├── generate-id.ts            # aw debate generate-id
            ├── create.ts                 # aw debate create
            ├── get-context.ts            # aw debate get-context
            ├── submit.ts                 # aw debate submit
            ├── wait.ts                   # aw debate wait (polling)
            ├── appeal.ts                 # aw debate appeal
            ├── request-completion.ts     # aw debate request-completion
            ├── ruling.ts                 # aw debate ruling
            ├── intervention.ts           # aw debate intervention
            ├── list.ts                   # aw debate list
            └── services/
                ├── start.ts              # aw debate services start
                ├── stop.ts               # aw debate services stop
                └── status.ts             # aw debate services status
```

---

## Package Configuration

### package.json

```json
{
  "name": "@aweave/cli-plugin-debate",
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

**Key points:**
- `"commands": "./dist/commands"` — oclif scans this directory for Command classes
- `"topicSeparator": " "` — space-separated topics (`aw debate create`, not `aw debate:create`)
- `"private": true` — workspace-only, not published to npm
- `@aweave/cli-shared` via `workspace:*` — local dependency

---

## Library Layer

### lib/config.ts — Environment Configuration

```typescript
export const DEBATE_SERVER_URL =
  process.env.DEBATE_SERVER_URL ?? 'http://127.0.0.1:3456';

export const DEBATE_AUTH_TOKEN = process.env.DEBATE_AUTH_TOKEN;

export const DEBATE_WAIT_DEADLINE =
  Number(process.env.DEBATE_WAIT_DEADLINE) || 120;

export const POLL_INTERVAL =
  Number(process.env.DEBATE_POLL_INTERVAL) || 2;

export const AUTO_START_SERVICES =
  process.env.AUTO_START_SERVICES !== 'false';
```

**Pattern:** All config comes from env vars with sensible defaults. No hardcoded values.

### lib/helpers.ts — Shared Helpers

```typescript
import { HTTPClient } from '@aweave/cli-shared';
import { DEBATE_AUTH_TOKEN, DEBATE_SERVER_URL } from './config';

export function getClient(): HTTPClient {
  const headers: Record<string, string> = {};
  if (DEBATE_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${DEBATE_AUTH_TOKEN}`;
  }
  return new HTTPClient({ baseUrl: DEBATE_SERVER_URL, headers });
}

/**
 * Token optimization: strip content from write responses.
 * Agent just submitted this content — don't echo it back.
 */
export function filterWriteResponse(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: data.id,
    argument_id: data.argument_id,
    state: data.state,
    type: data.type,
    seq: data.seq,
    debate_id: data.debate_id,
    created_at: data.created_at,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### lib/services.ts — Service Management

```typescript
import {
  checkHealth,
  checkPm2Process,
  MCPError,
  MCPResponse,
  runCommand,
  startPm2,
  waitForHealthy,
} from '@aweave/cli-shared';
import path from 'path';

const SERVER_NAME = 'aweave-server';
const WEB_NAME = 'debate-web';
const ECOSYSTEM_PATH = path.resolve(__dirname, '../../../../ecosystem.config.cjs');

export async function ensureServices(): Promise<MCPResponse> {
  // Check if already running
  const serverRunning = await checkPm2Process(SERVER_NAME);
  if (serverRunning) {
    const healthy = await checkHealth('http://127.0.0.1:3456/health', 2000);
    if (healthy) return new MCPResponse({ success: true });
  }

  // Start via pm2
  const started = await startPm2(ECOSYSTEM_PATH);
  if (!started) {
    return new MCPResponse({
      success: false,
      error: new MCPError(
        'SERVICE_START_FAILED',
        'Failed to start services via pm2',
        'Run: cd devtools && pm2 start ecosystem.config.cjs',
      ),
    });
  }

  // Wait for health
  const healthy = await waitForHealthy('http://127.0.0.1:3456/health', 15_000);
  if (!healthy) {
    return new MCPResponse({
      success: false,
      error: new MCPError(
        'TIMEOUT',
        'Server started but health check failed',
        'Check logs: pm2 logs aweave-server',
      ),
    });
  }

  return new MCPResponse({ success: true });
}
```

---

## Command Examples

### Simple Command — generate-id.ts

No server interaction, no flags. Simplest possible command.

```typescript
import { ContentType, MCPContent, MCPResponse, output } from '@aweave/cli-shared';
import { Command, Flags } from '@oclif/core';
import { randomUUID } from 'crypto';

export class DebateGenerateId extends Command {
  static description = 'Generate a new debate UUID';

  static flags = {
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
  };

  async run() {
    const { flags } = await this.parse(DebateGenerateId);
    const id = randomUUID();

    output(
      new MCPResponse({
        success: true,
        content: [new MCPContent({ type: ContentType.JSON, data: { id } })],
      }),
      flags.format,
    );
  }
}
```

### Write Command — create.ts

Complex command with service management, content reading, idempotency key, and token optimization.

```typescript
import {
  ContentType,
  handleServerError,
  HTTPClientError,
  MCPContent,
  MCPResponse,
  output,
  readContent,
} from '@aweave/cli-shared';
import { Command, Flags } from '@oclif/core';
import { randomUUID } from 'crypto';

import { AUTO_START_SERVICES } from '../../lib/config';
import { filterWriteResponse, getClient } from '../../lib/helpers';
import { ensureServices } from '../../lib/services';

export class DebateCreate extends Command {
  static description = 'Create a new debate with MOTION';

  static flags = {
    'debate-id': Flags.string({ required: true, description: 'Debate UUID' }),
    title: Flags.string({ required: true, description: 'Debate title' }),
    type: Flags.string({
      required: true,
      description: 'Debate type: coding_plan_debate|general_debate',
    }),
    file: Flags.string({ description: 'Path to motion content file' }),
    content: Flags.string({ description: 'Inline motion content' }),
    stdin: Flags.boolean({ description: 'Read motion content from stdin' }),
    'client-request-id': Flags.string({ description: 'Idempotency key' }),
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
  };

  async run() {
    const { flags } = await this.parse(DebateCreate);

    // 1. Ensure services running
    if (AUTO_START_SERVICES) {
      const serviceResp = await ensureServices();
      if (!serviceResp.success) {
        output(serviceResp, flags.format);
        this.exit(3);
      }
    }

    // 2. Read content from file/inline/stdin
    const result = await readContent({
      file: flags.file,
      content: flags.content,
      stdin: flags.stdin,
    });
    if (result.error) {
      output(result.error, flags.format);
      this.exit(4);
    }

    // 3. Generate idempotency key if not provided
    const reqId = flags['client-request-id'] ?? randomUUID();

    // 4. Call server
    try {
      const client = getClient();
      const resp = await client.post('/debates', {
        debate_id: flags['debate-id'],
        title: flags.title,
        debate_type: flags.type,
        motion_content: result.content,
        client_request_id: reqId,
      });

      // 5. Token optimization: strip content, keep IDs
      const data = (resp.data ?? {}) as Record<string, unknown>;
      const filtered = filterWriteResponse(data);
      filtered.client_request_id = reqId;

      output(
        new MCPResponse({
          success: true,
          content: [new MCPContent({ type: ContentType.JSON, data: filtered })],
          metadata: { message: 'Debate created successfully' },
        }),
        flags.format,
      );
    } catch (e) {
      if (e instanceof HTTPClientError) handleServerError(e, flags.format);
      throw e;
    }
  }
}
```

### Polling Command — wait.ts

Client-side interval polling with deadline timeout.

```typescript
import {
  ContentType,
  handleServerError,
  HTTPClientError,
  MCPContent,
  MCPResponse,
  output,
} from '@aweave/cli-shared';
import { Command, Flags } from '@oclif/core';

import { DEBATE_WAIT_DEADLINE, POLL_INTERVAL } from '../../lib/config';
import { getClient, sleep } from '../../lib/helpers';

export class DebateWait extends Command {
  static description = 'Wait for opponent response (polls server)';

  static flags = {
    'debate-id': Flags.string({ required: true, description: 'Debate UUID' }),
    'argument-id': Flags.string({ required: true, description: 'Last argument ID' }),
    role: Flags.string({ required: true, description: 'Your role: PROPONENT|OPPONENT' }),
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
  };

  async run() {
    const { flags } = await this.parse(DebateWait);
    const client = getClient();
    const deadline = Date.now() + DEBATE_WAIT_DEADLINE * 1000;

    try {
      while (Date.now() < deadline) {
        const resp = await client.get(
          `/debates/${flags['debate-id']}/poll`,
          {
            argument_id: flags['argument-id'],
            role: flags.role,
          },
        );

        const data = resp as Record<string, unknown>;

        if (data.status === 'new_argument') {
          // New argument found — return it
          output(
            new MCPResponse({
              success: true,
              content: [new MCPContent({ type: ContentType.JSON, data })],
              metadata: { resource_type: 'poll_result' },
            }),
            flags.format,
            true, // readableContent — unescape \n for AI readability
          );
          return;
        }

        // No new argument yet — wait and retry
        await sleep(POLL_INTERVAL * 1000);
      }

      // Deadline reached — return timeout with retry command
      output(
        new MCPResponse({
          success: true,
          content: [
            new MCPContent({
              type: ContentType.JSON,
              data: {
                status: 'timeout',
                debate_id: flags['debate-id'],
                last_argument_id: flags['argument-id'],
                retry_command: `aw debate wait --debate-id ${flags['debate-id']} --argument-id ${flags['argument-id']} --role ${flags.role}`,
              },
            }),
          ],
          metadata: { message: `Timed out after ${DEBATE_WAIT_DEADLINE}s` },
        }),
        flags.format,
      );
    } catch (e) {
      if (e instanceof HTTPClientError) handleServerError(e, flags.format);
      throw e;
    }
  }
}
```

**Polling pattern:**
- Client-side interval polling (NOT server long-polling)
- Configurable: `DEBATE_POLL_INTERVAL` (default 2s), `DEBATE_WAIT_DEADLINE` (default 120s)
- Timeout is not an error — returns `status: "timeout"` with retry command

### Read Command — get-context.ts

Read command with `readableContent` flag for AI readability.

```typescript
import {
  ContentType,
  handleServerError,
  HTTPClientError,
  MCPContent,
  MCPResponse,
  output,
} from '@aweave/cli-shared';
import { Command, Flags } from '@oclif/core';

import { getClient } from '../../lib/helpers';

export class DebateGetContext extends Command {
  static description = 'Get debate context with arguments';

  static flags = {
    'debate-id': Flags.string({ required: true, description: 'Debate UUID' }),
    limit: Flags.integer({ description: 'Limit number of arguments' }),
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
  };

  async run() {
    const { flags } = await this.parse(DebateGetContext);

    try {
      const client = getClient();
      const params: Record<string, string> = {};
      if (flags.limit) params.limit = String(flags.limit);

      const data = await client.get(
        `/debates/${flags['debate-id']}/context`,
        params,
      );

      output(
        new MCPResponse({
          success: true,
          content: [
            new MCPContent({
              type: ContentType.JSON,
              data: data as Record<string, unknown>,
            }),
          ],
          metadata: { resource_type: 'debate_context' },
        }),
        flags.format,
        true, // readableContent — unescape \n\t for AI readability
      );
    } catch (e) {
      if (e instanceof HTTPClientError) handleServerError(e, flags.format);
      throw e;
    }
  }
}
```

### Service Management — services/start.ts

```typescript
import { output } from '@aweave/cli-shared';
import { Command, Flags } from '@oclif/core';

import { ensureServices } from '../../../lib/services';

export class DebateServicesStart extends Command {
  static description = 'Start debate services (server + web)';

  static flags = {
    format: Flags.string({
      default: 'json',
      options: ['json', 'markdown'],
      description: 'Output format',
    }),
  };

  async run() {
    const { flags } = await this.parse(DebateServicesStart);
    const resp = await ensureServices();
    output(resp, flags.format);
    if (!resp.success) this.exit(3);
  }
}
```

---

## Registration in Main CLI

### devtools/common/cli/package.json (relevant sections)

```json
{
  "dependencies": {
    "@aweave/cli-plugin-debate": "workspace:*"
  },
  "oclif": {
    "bin": "aw",
    "dirname": "aweave",
    "commands": "./dist/commands",
    "topicSeparator": " ",
    "plugins": [
      "@aweave/cli-plugin-debate"
    ]
  }
}
```

### devtools/pnpm-workspace.yaml

```yaml
packages:
  - 'common/cli'
  - 'common/cli-shared'
  - 'common/cli-plugin-debate'
```

---

## Usage Examples

```bash
# Generate debate ID
aw debate generate-id

# Create debate
aw debate create \
  --debate-id "$(aw debate generate-id | jq -r '.content[0].data.id')" \
  --title "Architecture Decision" \
  --type coding_plan_debate \
  --file ./motion.md

# Get context
aw debate get-context --debate-id <uuid>

# Submit argument
aw debate submit \
  --debate-id <uuid> \
  --role PROPONENT \
  --target-id <argument-id> \
  --content "My argument..."

# Wait for response
aw debate wait \
  --debate-id <uuid> \
  --argument-id <arg-id> \
  --role PROPONENT

# Service management
aw debate services start
aw debate services status
aw debate services stop
```

---

## Output Examples

### Success (generate-id)

```json
{
  "success": true,
  "content": [
    {
      "type": "json",
      "data": {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
      }
    }
  ]
}
```

### Success (create — token-optimized)

```json
{
  "success": true,
  "content": [
    {
      "type": "json",
      "data": {
        "id": "a1b2c3d4",
        "argument_id": "x1y2z3",
        "state": "OPEN",
        "type": "MOTION",
        "seq": 1,
        "client_request_id": "req-123"
      }
    }
  ],
  "metadata": {
    "message": "Debate created successfully"
  }
}
```

### Error (with suggestion)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Debate a1b2c3d4 not found",
    "suggestion": "Verify the debate ID is correct. Use: aw debate list"
  }
}
```

### Timeout (wait command)

```json
{
  "success": true,
  "content": [
    {
      "type": "json",
      "data": {
        "status": "timeout",
        "debate_id": "a1b2c3d4",
        "last_argument_id": "x1y2z3",
        "retry_command": "aw debate wait --debate-id a1b2c3d4 --argument-id x1y2z3 --role PROPONENT"
      }
    }
  ],
  "metadata": {
    "message": "Timed out after 120s"
  }
}
```
