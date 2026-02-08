# Tinybots Project

- TinyBots is a set of backend services, frontend apps, and Wonkers apps for telemetry, automation, and TaaS order flows.
- This overview lists all discovered repositories grouped by role with links to their repo overviews.
- Use the coverage table to spot missing repo overviews quickly.

## Platform Purpose & Landscape

- Telemetry from robots and partners is ingested, evaluated, and dispatched to downstream automation and order flows.
- Customer and admin surfaces expose REST and GraphQL gateways backed by shared schemas and database migrations.
- Shared libraries and tooling standardize middleware, HTTP clients, and contracts for consistent integrations.

## Services

### Automation Core

- azi-3-status-check: Status check API and evaluation workflows (devdocs/projects/tinybots/backend/azi-3-status-check/OVERVIEW.md)
- eve: Schedule management service for Tessa robots (devdocs/projects/tinybots/backend/eve/OVERVIEW.md)
- herbie: Background cleanup of expired user and robot accounts (devdocs/projects/tinybots/backend/herbie/OVERVIEW.md)
- m-o-triggers: Trigger scheduling and queue fan-out (devdocs/projects/tinybots/backend/m-o-triggers/OVERVIEW.md)
- megazord-events: Event intake and fan-out for robot telemetry (devdocs/projects/tinybots/backend/megazord-events/OVERVIEW.md)
- micro-manager: Robot script lifecycle and execution service (devdocs/projects/tinybots/backend/micro-manager/OVERVIEW.md)
- sensara-adaptor: Sensara telemetry bridge into TinyBots events (devdocs/projects/tinybots/backend/sensara-adaptor/OVERVIEW.md)
- wadsworth: Speech interaction service mapping voice commands to scripts (devdocs/projects/tinybots/backend/wadsworth/OVERVIEW.md)
- wonkers-nedap: Nedap ONS integration syncing orders and returns into TaaS flows (devdocs/projects/tinybots/backend/wonkers-nedap/OVERVIEW.md)

### Experience & Business Apps

- wonkers-api: Dashboard REST API for customers and admins (devdocs/projects/tinybots/backend/wonkers-api/OVERVIEW.md)
- wonkers-accounts: Accounts, permissions, and login flows (devdocs/projects/tinybots/backend/wonkers-accounts/OVERVIEW.md)
- wonkers-robots: Robot inventory and admin management (devdocs/projects/tinybots/backend/wonkers-robots/OVERVIEW.md)
- wonkers-taas-orders: TaaS order lifecycle management (devdocs/projects/tinybots/backend/wonkers-taas-orders/OVERVIEW.md)
- wonkers-graphql: GraphQL gateway for reporting across TinyBots data (devdocs/projects/tinybots/backend/wonkers-graphql/OVERVIEW.md)
- wonkers-ecd: Ecare and ZSP notification bridge into TaaS order flows (devdocs/projects/tinybots/backend/wonkers-ecd/OVERVIEW.md)

### Shared Libraries, Tooling & Schemas

- atlas: Batch jobs that anonymise and copy typ-e data to the intelligence database (devdocs/projects/tinybots/backend/atlas/OVERVIEW.md)
- cves-scan: Vulnerability scan tooling and CI scripts (devdocs/projects/tinybots/backend/cves-scan/OVERVIEW.md)
- tiny-backend-tools: Shared Node.js service scaffolding and middleware (devdocs/projects/tinybots/backend/tiny-backend-tools/OVERVIEW.md)
- tiny-internal-services: Shared DTOs and HTTP clients for TinyBots services (devdocs/projects/tinybots/backend/tiny-internal-services/OVERVIEW.md)
- tiny-internal-services-mocks: Mocks and stubs for integration tests (devdocs/projects/tinybots/backend/tiny-internal-services-mocks/OVERVIEW.md)
- tiny-specs: Centralized OpenAPI specs generating TypeScript types and validators for frontend/backend consistency (devdocs/projects/tinybots/backend/tiny-specs/OVERVIEW.md)
- typ-e: MySQL schema and Flyway migrations for robot scheduling and automation data (devdocs/projects/tinybots/backend/typ-e/OVERVIEW.md)
- wonkers-db: MySQL schema and Flyway migrations for dashboard and TaaS order data (devdocs/projects/tinybots/backend/wonkers-db/OVERVIEW.md)

## Frontend

### Customer Apps

- ui.r2d2: Customer dashboard React app for managing Tessa robots — schedules, music, scripts, speech interactions (devdocs/projects/tinybots/frontend/ui.r2d2/OVERVIEW.md)

### Admin Apps

- wonkers-dash-admin: Internal admin dashboard for TaaS orders, robots, organisations, and device enrollment (devdocs/projects/tinybots/frontend/wonkers-dash-admin/OVERVIEW.md)

## Cross-Service Data Flows

- Telemetry from Sensara and robots enters sensara-adaptor and megazord-events, then dispatches triggers to m-o-triggers and status workflows.
- Status evaluations update databases and publish queue messages surfaced through wonkers-api, wonkers-graphql, and micro-manager script executions.
- Robot schedules are managed by eve and stored in typ-e database, with downstream notifications to keep automation in sync.
- Voice commands from robots are resolved by wadsworth, mapping spoken phrases to scripts validated and executed by micro-manager.
- External notifications from Ecare and ZSP pass through wonkers-ecd into TaaS order and dashboard flows using shared schemas and clients.
- Nedap ONS survey results are polled by wonkers-nedap, mapped into concept DTOs, and pushed into wonkers-taas-orders.
- Script and execution data is copied from typ-e into the intelligence database by atlas with anonymisation applied for analytics use.

## Operational Notes & Testing

- **Source Code Location:**
  - Backend repositories: `projects/tinybots/backend/<repo>/`
  - Frontend repositories: `projects/tinybots/frontend/<repo>/`
  - Following `projects/<PROJECT_NAME>/<DOMAIN>/<REPO_NAME>/` convention.
- Most backend services are Node.js/TypeScript (Yarn); schema repos use Java/Maven.
- Frontend apps are React/TypeScript with npm.
- Shared middleware and scaffolding live in tiny-backend-tools; shared clients and DTOs live in tiny-internal-services.
- Run backend tests via the centralized DevTools commands from the workspace root: `just -f devtools/tinybots/local/Justfile test-<repo>`.
- Run frontend tests via npm: `cd projects/tinybots/frontend/<repo> && npm test`.
- Keep repo overviews under `devdocs/projects/tinybots/<DOMAIN>/<repo>/OVERVIEW.md` up to date; missing overviews should be added when the repo is actively worked on.

## DevTools Infrastructure

TinyBots uses a centralized DevTools infrastructure located at `devtools/tinybots/local/`. Key capabilities:

| Feature | Description |
|---------|-------------|
| **Docker Compose** | Single `docker-compose.yaml` defining all databases, migration runners, and shared services |
| **Just Commands** | Repository-specific commands for starting dependencies, running tests, and dev mode |
| **Seed Data** | NPM scripts to populate databases with realistic test data |
| **Database Services** | MySQL containers for typ-e-db, wonkers-db, and atlas-intelligence-db |

**Quick Commands:**

```bash
# Run tests for a repository
just -f devtools/tinybots/local/Justfile test-<repo>

# Start dependencies for local development
just -f devtools/tinybots/local/Justfile start-<repo>

# View service logs
just -f devtools/tinybots/local/Justfile log-<repo>
```

> **For detailed setup and all available commands**, see: `devdocs/misc/devtools/tinybots/OVERVIEW.md`

## Rules Reference

Rules are **mandatory** and must be followed. Load the relevant rule **before** performing the task.

| Rule | Load When | Path |
|------|-----------|------|
| run-tests | Running tests for any repository | `devdocs/agent/rules/tinybots/run-tests.md` |

## Commands Reference

Commands provide step-by-step workflows for complex tasks. Load the command **before** starting the task.

| Command | Use When | Path |
|---------|----------|------|
| update-tiny-specs | Adding/updating OpenAPI schemas, generating types for frontend | `devdocs/agent/commands/tinybots/update-tiny-specs.md` |

## Skills Reference

Load skills **on-demand** when working on related tasks. Do not load proactively.

| Skill | Load When | Path |
|-------|-----------|------|
| database-access | Schema changes, migrations, DB queries | `devdocs/agent/skills/tinybots/database-access/SKILL.md` |
| testing-guidelines | Writing or fixing tests | `devdocs/agent/skills/tinybots/testing-guidelines/SKILL.md` |

## Repository Coverage Table

### Backend

| Repository | Service Group | Overview Path | Status |
| --- | --- | --- | --- |
| atlas | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/atlas/OVERVIEW.md | Present |
| azi-3-status-check | Automation Core | devdocs/projects/tinybots/backend/azi-3-status-check/OVERVIEW.md | Present |
| cves-scan | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/cves-scan/OVERVIEW.md | Missing |
| eve | Automation Core | devdocs/projects/tinybots/backend/eve/OVERVIEW.md | Present |
| herbie | Automation Core | devdocs/projects/tinybots/backend/herbie/OVERVIEW.md | Missing |
| m-o-triggers | Automation Core | devdocs/projects/tinybots/backend/m-o-triggers/OVERVIEW.md | Present |
| megazord-events | Automation Core | devdocs/projects/tinybots/backend/megazord-events/OVERVIEW.md | Present |
| micro-manager | Automation Core | devdocs/projects/tinybots/backend/micro-manager/OVERVIEW.md | Present |
| sensara-adaptor | Automation Core | devdocs/projects/tinybots/backend/sensara-adaptor/OVERVIEW.md | Present |
| wadsworth | Automation Core | devdocs/projects/tinybots/backend/wadsworth/OVERVIEW.md | Present |
| wonkers-nedap | Automation Core | devdocs/projects/tinybots/backend/wonkers-nedap/OVERVIEW.md | Present |
| wonkers-api | Experience & Business Apps | devdocs/projects/tinybots/backend/wonkers-api/OVERVIEW.md | Present |
| wonkers-accounts | Experience & Business Apps | devdocs/projects/tinybots/backend/wonkers-accounts/OVERVIEW.md | Present |
| wonkers-ecd | Experience & Business Apps | devdocs/projects/tinybots/backend/wonkers-ecd/OVERVIEW.md | Present |
| wonkers-graphql | Experience & Business Apps | devdocs/projects/tinybots/backend/wonkers-graphql/OVERVIEW.md | Present |
| wonkers-robots | Experience & Business Apps | devdocs/projects/tinybots/backend/wonkers-robots/OVERVIEW.md | Present |
| wonkers-taas-orders | Experience & Business Apps | devdocs/projects/tinybots/backend/wonkers-taas-orders/OVERVIEW.md | Present |
| tiny-backend-tools | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/tiny-backend-tools/OVERVIEW.md | Present |
| tiny-internal-services | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/tiny-internal-services/OVERVIEW.md | Present |
| tiny-internal-services-mocks | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/tiny-internal-services-mocks/OVERVIEW.md | Present |
| tiny-specs | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/tiny-specs/OVERVIEW.md | Present |
| typ-e | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/typ-e/OVERVIEW.md | Present |
| wonkers-db | Shared Libraries, Tooling & Schemas | devdocs/projects/tinybots/backend/wonkers-db/OVERVIEW.md | Present |

### Frontend

| Repository | Service Group | Overview Path | Status |
| --- | --- | --- | --- |
| ui.r2d2 | Customer Apps | devdocs/projects/tinybots/frontend/ui.r2d2/OVERVIEW.md | Present |
| wonkers-dash-admin | Admin Apps | devdocs/projects/tinybots/frontend/wonkers-dash-admin/OVERVIEW.md | Present |
