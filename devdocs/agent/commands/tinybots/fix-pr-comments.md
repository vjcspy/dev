# Fix PR Comments

## Role & Objective

Act as a **Senior Code Reviewer** and **Developer**.

Your goal is to analyze Bitbucket PR comments and tasks from reviewers, evaluate their validity, provide expert assessment, and fix approved items only after user confirmation.

## Input Variables

- `WORKSPACE`: Bitbucket workspace (default: `tinybots`)
- `REPO_SLUG`: Repository name (e.g., `micro-manager`)
- `PR_ID`: Pull request number

## Environment Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `BITBUCKET_USER` | Bitbucket username/email | `user@example.com` |
| `BITBUCKET_APP_PASSWORD` | Bitbucket App Password | `ATATTxxxxx...` |

> **Note:** Create an App Password at: <https://bitbucket.org/account/settings/app-passwords/>
> Required permissions: `Repositories: Read`, `Pull requests: Read`

---

## CLI Execution

- Requirement: Use the globally installed `aw` in PATH. Do not run via `uv run aw` or shell wrappers.
- Pre-flight check (mandatory):

  ```bash
  aw --help
  ```

  If this fails or `aw` is not found, STOP and fix your environment first. See Quickstart in `devtools/README.md` for installation and PATH setup.
- Standard commands:

  ```bash
  aw tinybots-bitbucket pr micro-manager 126 -w tinybots
  aw tinybots-bitbucket comments micro-manager 126 -w tinybots --limit 100
  aw tinybots-bitbucket tasks micro-manager 126 -w tinybots --limit 100
  ```

- Environment: Ensure `BITBUCKET_USER` and `BITBUCKET_APP_PASSWORD` are exported in your shell session before running commands.

---

## Phase 1: Fetch PR Data

**Action:** Use the `aw tinybots-bitbucket` CLI to fetch all necessary data.

### Step 1.1: Get PR Info

```bash
aw tinybots-bitbucket pr {REPO_SLUG} {PR_ID} -w {WORKSPACE}
```

**Response format (MCP-style JSON):**

```json
{
  "success": true,
  "content": [{
    "type": "json",
    "data": {
      "id": 126,
      "title": "feat: implement API for ...",
      "author": {"display_name": "Kai", "uuid": "..."},
      "source_branch": "feature/xxx",
      "destination_branch": "main",
      "state": "OPEN"
    }
  }],
  "metadata": {"workspace": "tinybots", "repo_slug": "micro-manager", "resource_type": "pull_request"}
}
```

### Step 1.2: Get All Comments

```bash
aw tinybots-bitbucket comments {REPO_SLUG} {PR_ID} -w {WORKSPACE} --limit 100
```

**Response format:**

```json
{
  "success": true,
  "content": [
    {
      "type": "json",
      "data": {
        "id": 740667474,
        "content": "Why not create a separate model?",
        "author": {"display_name": "Max", "uuid": "..."},
        "file_path": "src/controllers/UserController.ts",
        "line": 29,
        "created_on": "2026-01-19T11:02:38+00:00"
      }
    }
  ],
  "metadata": {"resource_type": "pr_comments"},
  "has_more": false,
  "total_count": 11
}
```

> **Note:** If `has_more: true`, fetch more with `--offset {next_offset}`

### Step 1.3: Get All Tasks

```bash
aw tinybots-bitbucket tasks {REPO_SLUG} {PR_ID} -w {WORKSPACE} --limit 100
```

**Response format:**

```json
{
  "success": true,
  "content": [
    {
      "type": "json",
      "data": {
        "id": 58007442,
        "content": "Fix formatting and case issues",
        "state": "RESOLVED",
        "comment_id": null,
        "creator": {"display_name": "Max", "uuid": "..."}
      }
    },
    {
      "type": "json",
      "data": {
        "id": 58006601,
        "content": "Separate model",
        "state": "UNRESOLVED",
        "comment_id": 740667474,
        "creator": {"display_name": "Max", "uuid": "..."}
      }
    }
  ],
  "metadata": {"resource_type": "pr_tasks"},
  "has_more": false,
  "total_count": 3
}
```

---

## Phase 2: Analyze & Map Relationships

**Action:** Build a comprehensive view of comments and tasks.

### Step 2.1: Create Comment-Task Mapping

Use `comment_id` field in tasks to link with comments:

```
┌──────────────────────────────────────────────────────────────────┐
│ TASKS (Required Work)                                            │
├──────────────────────────────────────────────────────────────────┤
│ [TASK-58006601] "Separate model"                                 │
│   └── Linked Comment: #740667474                                 │
│       └── File: src/controllers/UserController.ts (Line 29)      │
│       └── Content: "Why not create a separate model?"            │
│   └── Status: UNRESOLVED                                         │
├──────────────────────────────────────────────────────────────────┤
│ [TASK-58007442] "Fix formatting and case issues"                 │
│   └── Linked Comment: (none - standalone task)                   │
│   └── Status: RESOLVED                                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ORPHAN COMMENTS (Nice-to-have, no task created)                  │
├──────────────────────────────────────────────────────────────────┤
│ [COMMENT-740668693] File: src/controllers/UserController.ts      │
│   └── Content: "Should add the response to tiny-specs..."        │
│   └── Author: Max                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Step 2.2: Categorize Items

Group by priority:

1. **MUST FIX**: Tasks with `state: "UNRESOLVED"`
2. **SHOULD CONSIDER**: Orphan comments (no linked task)
3. **ALREADY DONE**: Tasks with `state: "RESOLVED"`

---

## Phase 3: Expert Assessment

**Action:** Provide professional evaluation of each item.

For EACH task/comment, analyze:

### Assessment Template

```markdown
### [TASK/COMMENT-ID] "{Title/Summary}"

**Location:** `path/to/file.ts` (Line X)
**Reviewer:** {Reviewer Name}
**Type:** Task / Comment-only

**Reviewer's Point:**
> "{Original comment text}"

**Expert Assessment:**
- **Validity:** ✅ Valid / ⚠️ Partially Valid / ❌ Not Recommended
- **Reasoning:** [Explain why this feedback is valid/invalid from an expert perspective]
- **Impact:** [What happens if we fix vs. don't fix]
- **Effort:** Low / Medium / High

**Recommendation:**
- [ ] FIX - {Brief description of what to do}
- [ ] SKIP - {Reason to skip}
- [ ] DISCUSS - {Need more context}
```

### Assessment Criteria

Evaluate based on:

1. **Code Quality**: Does it improve maintainability, readability?
2. **Consistency**: Does it align with project conventions?
3. **Performance**: Does it have performance implications?
4. **Architecture**: Is it architecturally sound?
5. **Practicality**: Is the effort justified by the benefit?

---

## Phase 4: Present Report to User

**Action:** Generate comprehensive report and ASK for approval.

### Report Format

```markdown
# PR #{PR_ID} Review Analysis

## Summary
- **PR Title:** {title}
- **Author:** {author}
- **Branch:** {source_branch} → {destination_branch}
- **Total Tasks:** X (Y unresolved)
- **Total Comments:** Z (W without tasks)

---

## 🔴 UNRESOLVED TASKS (Must Address)

### [T1] {Task Title}
{Assessment from Phase 3}

### [T2] {Task Title}
{Assessment from Phase 3}

---

## 🟡 ORPHAN COMMENTS (Nice-to-have)

### [C1] {Comment Summary}
{Assessment from Phase 3}

---

## 📋 ACTION PLAN

Based on my analysis, here's my recommended action plan:

| ID | Item | Recommendation | Effort |
|----|------|----------------|--------|
| T1 | {Task} | ✅ FIX | Low |
| T2 | {Task} | ⚠️ DISCUSS | Medium |
| C1 | {Comment} | ❌ SKIP | - |

---

## ⏳ AWAITING YOUR DECISION

Please review and tell me which items to fix:
- "Fix all" - I'll fix all recommended items
- "Fix T1, T2" - I'll fix specific items
- "Skip C1" - I'll skip specific items
- Ask questions about any item
```

**CRITICAL:** DO NOT proceed to fix anything until user explicitly approves.

---

## Phase 5: Execute Fixes (After Approval Only)

**Action:** Fix only the approved items.

### Step 5.1: Read Target Files

Before making changes, read the relevant source files to understand context.

### Step 5.2: Make Changes

For each approved item:

1. Navigate to the file/line mentioned
2. Understand the surrounding code context
3. Apply the fix following project conventions
4. Verify the fix doesn't break existing functionality

### Step 5.3: Report Changes

After fixing, report:

```markdown
## ✅ Completed Fixes

### [T1] {Task Title}
- **File:** `path/to/file.ts`
- **Change:** {Description of what was changed}
- **Lines affected:** X-Y

{Show code diff or summary}

### [T2] {Task Title}
...
```

---

## Phase 6: Post-Fix Verification

**Action:** Verify changes and suggest next steps.

### Checklist

- [ ] All approved items have been addressed
- [ ] No linter errors introduced
- [ ] Code follows project conventions
- [ ] Related tests still pass (if applicable)

### Suggest Next Steps

```markdown
## 🚀 Next Steps

1. Review the changes I made
2. Run tests locally: `npm test` / `just test`
3. Commit changes with message: `fix: address PR review comments`
4. Push and request re-review from {Reviewer Name}
```

---

## Error Handling

The CLI returns MCP-style error responses:

```json
{
  "success": false,
  "error": {
    "code": "AUTH_FAILED",
    "message": "Authentication failed",
    "suggestion": "Check your credentials (username/password or token)"
  }
}
```

| Error Code | Cause | Action |
|------------|-------|--------|
| `AUTH_FAILED` | Invalid credentials | Check `BITBUCKET_USER` and `BITBUCKET_APP_PASSWORD` |
| `FORBIDDEN` | Insufficient permissions | Verify App Password has required permissions |
| `NOT_FOUND` | PR/repo doesn't exist | Verify workspace, repo slug, and PR ID |
| `HTTP_xxx` | Other API errors | Check error message for details |

**Missing credentials error:**

```
Error: BITBUCKET_USER and BITBUCKET_APP_PASSWORD environment variables required.
```

---

## Example Usage

```
User: Check PR 126 on micro-manager and help me fix the comments

Agent:
1. Runs: aw tinybots-bitbucket pr micro-manager 126
2. Runs: aw tinybots-bitbucket comments micro-manager 126 --limit 100
3. Runs: aw tinybots-bitbucket tasks micro-manager 126 --limit 100
4. Parses MCP responses to extract PR info, comments, and tasks
5. Maps relationships between comments and tasks using comment_id
6. Provides expert assessment for each item
7. Presents report and waits for user approval
8. After approval, fixes only the approved items
9. Reports changes and suggests next steps
```
