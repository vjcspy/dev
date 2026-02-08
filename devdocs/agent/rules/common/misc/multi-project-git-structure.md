# Multi-Project Git Structure

This workspace manages multiple independent projects in a single repository. Git branches and `.gitignore` patterns separate common (shared) content from project-specific content.

## Branch Architecture

```
master                    ← Common/shared content only
├── projects/tinybots     ← master + tinybots-specific content
├── projects/vocalmeet    ← master + vocalmeet-specific content
├── projects/nab          ← master + nab-specific content
└── projects/<NEW>        ← master + new project content
```

### master branch

Contains **only** shared/common content:

| Area | What is tracked | Pattern |
|---|---|---|
| `devdocs/agent/commands/common/` | Shared agent commands | `commands/*` + `!commands/common/` |
| `devdocs/agent/rules/common/` | Shared agent rules | `rules/*` + `!rules/common/` |
| `devdocs/agent/skills/common/` | Shared agent skills | `skills/*` + `!skills/common/` |
| `devdocs/agent/templates/common/` | Shared templates | `templates/*` + `!templates/common/` |
| `devdocs/misc/devtools/common/` | Shared devtools docs | `*/` + `!common/` |
| `devdocs/misc/devtools/plans/` | Common devtools plans | `*/` + `!plans/` |
| `devtools/common/` | Shared dev tools (CLI, libs) | `*/` + `!common/` |
| `devtools/scripts/` | Shared scripts | `*/` + `!scripts/` |
| `devtools/` root files | Monorepo config (package.json, turbo.json, etc.) | Root files not matched by `*/` |

### Project branches (`projects/PROJECT_NAME`)

Inherit everything from master, plus project-specific content unlocked via negate patterns appended to `.gitignore`.

## Gitignore Pattern System

The `.gitignore` uses an **exclude-all + negate** strategy:

1. **Positive patterns** exclude all content in a directory (e.g., `devdocs/agent/commands/*`)
2. **Negate patterns** (`!`) re-include specific subdirectories (e.g., `!devdocs/agent/commands/common/`)
3. On master, only `common/` (and similar shared dirs) are negated
4. On project branches, additional negate patterns are **appended at the end** of the file

### Pattern Types Used

| Pattern | Matches | Used for |
|---|---|---|
| `dir/*` | All entries (files + dirs) one level inside `dir/` | `devdocs/agent/commands/*`, `devdocs/projects/*` |
| `dir/*/` | All **directories** one level inside `dir/` (files untouched) | `devdocs/misc/devtools/*/`, `devtools/*/` |
| `dir/**` | Everything recursively at any depth | `projects/**` (source code, always excluded) |
| `!dir/name/` | Re-include a specific directory | Negate patterns for common/ and project dirs |

### Why single star (`*`) not double star (`**`)

For directories where project branches need to negate entries, **always use single star** (`*` or `*/`):

- `devdocs/projects/*` — allows simple negation: `!devdocs/projects/tinybots/`
- `devdocs/projects/**` — negation requires **two lines** (`!.../tinybots/` + `!.../tinybots/**`) because `**` matches at all depths and blocks re-inclusion of nested content

**Exception:** `projects/**` uses double star because source code is **never tracked** on any branch.

## Always Excluded (All Branches)

These are **never** tracked regardless of branch:

| Path | Reason |
|---|---|
| `projects/**` | Source code — managed externally (separate repos, submodules, etc.) |
| `.DS_Store` | OS artifact |
| `.idea/`, `.cursor/`, `.trae/` | IDE configs |
| `AGENTS.md` | Symlink |

## Creating a New Project Branch

When setting up a new project (e.g., `newproject`):

### Step 1: Create and switch to branch

```bash
git checkout master
git pull origin master
git checkout -b projects/newproject
```

### Step 2: Append negate patterns to `.gitignore`

Add the following block at the **end** of `.gitignore`:

```gitignore
# ========================================
# Branch: projects/newproject
# ========================================
!devdocs/agent/commands/newproject/
!devdocs/agent/rules/newproject/
!devdocs/agent/skills/newproject/
!devdocs/agent/templates/newproject/
!devdocs/misc/devtools/newproject/
!devdocs/projects/newproject/
!devtools/newproject/
```

### Step 3: Create project directories (as needed)

```bash
mkdir -p devdocs/agent/commands/newproject
mkdir -p devdocs/agent/rules/newproject
mkdir -p devdocs/agent/skills/newproject
mkdir -p devdocs/agent/templates/newproject
mkdir -p devdocs/projects/newproject
mkdir -p devtools/newproject/local
```

### Step 4: Verify

```bash
# Should show new project dirs as untracked (??)
git status

# Should confirm project dirs are NOT ignored
git check-ignore -v devdocs/projects/newproject/
# Expected: exit code 1 (not ignored) or shows negation pattern

# Should confirm other projects ARE still ignored
git check-ignore -v devdocs/projects/otherproject/
# Expected: shows positive ignore pattern from master
```

### Step 5: Commit and push

```bash
git add .gitignore
git commit -m "chore: setup projects/newproject branch gitignore"
git push -u origin projects/newproject
```

## Merging Updates from Master

Project branches should periodically sync with master:

```bash
git checkout projects/newproject
git rebase master
# Or: git merge master
```

Since project branches only **append** negate patterns at the end of `.gitignore`, merge conflicts are minimal. Conflicts only occur if master also modifies the last lines of the file.

## Reference: Master `.gitignore` Structure

```gitignore
# OS & IDE
.DS_Store
.idea/
.cursor/
.trae/
AGENTS.md

# Source Code (always excluded)
projects/**
!projects/.gitkeep

# devdocs/agent — only common/
devdocs/agent/commands/*
!devdocs/agent/commands/common/
devdocs/agent/rules/*
!devdocs/agent/rules/common/
devdocs/agent/skills/*
!devdocs/agent/skills/common/
devdocs/agent/templates/*
!devdocs/agent/templates/common/

# devdocs/projects — excluded entirely
devdocs/projects/*
!devdocs/projects/.gitkeep

# devdocs/misc/devtools — only common/ and plans/
devdocs/misc/devtools/*/
!devdocs/misc/devtools/common/
!devdocs/misc/devtools/plans/

# devtools — only common/, scripts/ and root files
devtools/*/
!devtools/common/
!devtools/scripts/
```
