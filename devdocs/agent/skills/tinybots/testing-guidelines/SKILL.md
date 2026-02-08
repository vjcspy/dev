---
name: testing-guidelines
description: TinyBots testing best practices and assertion patterns for writing integration tests
---

# TinyBots Testing Guidelines

When writing tests for TinyBots repositories, follow these guidelines for consistent, maintainable test code.

## Assertion Best Practices

### Use `deep.include` for Object Assertions

Prefer `expect(obj).to.deep.include({...})` over checking individual fields one by one. This provides a balance between conciseness and flexibility.

```javascript
// ❌ Avoid: Verbose individual field checks
expect(res.body.id).to.equal(scheduledExecutionId)
expect(res.body.executionType).to.equal('scheduled')
expect(res.body.executedAt).to.equal(plannedIso)
expect(res.body.schedule.scheduleId).to.equal(880011)

// ✅ Prefer: deep.include for partial matching
expect(res.body).to.deep.include({
  id: scheduledExecutionId,
  executionType: 'scheduled',
  executedAt: plannedIso,
  schedule: { scheduleId: 880011 }
})
```

### Why `deep.include` over `deep.equal`

| Benefit | Description |
|---------|-------------|
| **Ignores dynamic fields** | Doesn't fail on `createdAt`, `updatedAt`, etc. |
| **Less brittle** | Won't break if new fields are added to the response |
| **Validates structure** | Still validates nested object structure correctly |

### When to Use Individual Checks

Use separate assertions when you need:

- **Array length checks**: Verify collection sizes
- **Type checks**: Confirm data types explicitly
- **Specific error messages**: Need custom failure messages for specific fields

```javascript
// Combine deep.include with specific checks
expect(res.body).to.deep.include({ id: expectedId, status: 'active' })
expect(res.body.items).to.be.an('array').with.lengthOf(3)
```

## Test Structure

### Arrange-Act-Assert Pattern

```javascript
it('should return execution details', async () => {
  // Arrange - setup test data
  const executionId = await createTestExecution()
  
  // Act - perform the action
  const res = await request(app)
    .get(`/v6/scripts/user/robots/1/executions/${executionId}`)
    .set('x-authenticated-userid', '1')
  
  // Assert - verify results
  expect(res.status).to.equal(200)
  expect(res.body).to.deep.include({
    id: executionId,
    executionType: 'triggered'
  })
})
```

### Descriptive Test Names

- Use `should` prefix for clarity
- Describe the expected behavior, not the implementation
- Include relevant context (e.g., "when user is not authenticated")

```javascript
// ✅ Good
it('should return 404 when execution does not exist')
it('should return paginated results when limit is specified')

// ❌ Avoid
it('test execution endpoint')
it('works correctly')
```

## Debugging Multiple Failed Tests

When multiple test cases fail, **do NOT attempt to fix all at once**. Follow this systematic batch approach to optimize debugging time.

### Batch Strategy (Max 5 Tests per Iteration)

> **Why batch?** Running tests takes time. Processing up to 5 failing tests per iteration optimizes the debug-fix cycle.

**Workflow:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. Add .only + debug logs to up to 5 failing tests         │
│  2. Run tests once → collect all debug output               │
│  3. Analyze logs → plan fixes for all 5 issues              │
│  4. Implement fixes for all 5 tests                         │
│  5. Remove .only + debug logs → run full suite              │
│  6. Repeat until all tests pass                             │
└─────────────────────────────────────────────────────────────┘
```

**Example - Batch of 5 failing tests:**

```javascript
// Add .only to multiple failing tests in the same run
it.only('should return execution details', async () => {
  console.log('[DEBUG_FIX_1] Response:', JSON.stringify(res.body, null, 2))
  // ...
})

it.only('should handle pagination', async () => {
  console.log('[DEBUG_FIX_2] Response:', JSON.stringify(res.body, null, 2))
  // ...
})

it.only('should filter by date', async () => {
  console.log('[DEBUG_FIX_3] Response:', JSON.stringify(res.body, null, 2))
  // ...
})

// ... up to 5 tests with unique anchors [DEBUG_FIX_1], [DEBUG_FIX_2], etc.
```

> **Tip:** Use numbered anchors `[DEBUG_FIX_1]`, `[DEBUG_FIX_2]`, etc. to easily identify which log belongs to which test.

### Step 1: Isolate Failing Tests (Batch of 5)

Add `.only` to **up to 5 failing tests** at once:

```javascript
// ❌ Don't run all tests when debugging
it('should return execution details', async () => { ... })

// ✅ Add .only to multiple failing tests (max 5 per batch)
it.only('should return execution details', async () => { ... })
it.only('should handle pagination', async () => { ... })
it.only('should filter by status', async () => { ... })
```

### Step 2: Add Debug Logging with Numbered Anchors

Insert `console.log` with **numbered anchors** for each test:

```javascript
it.only('should return execution details', async () => {
  const res = await request(app)
    .get(`/v6/scripts/user/robots/1/executions/${executionId}`)
    .set('x-authenticated-userid', '1')
  
  // Use numbered anchor to identify this specific test
  console.log('[DEBUG_FIX_1] Test: should return execution details')
  console.log('[DEBUG_FIX_1] Response status:', res.status)
  console.log('[DEBUG_FIX_1] Response body:', JSON.stringify(res.body, null, 2))
  
  expect(res.status).to.equal(200)
})

it.only('should handle pagination', async () => {
  // ...
  console.log('[DEBUG_FIX_2] Test: should handle pagination')
  console.log('[DEBUG_FIX_2] Response:', JSON.stringify(res.body, null, 2))
  // ...
})
```

### Step 3: Run Once, Analyze All, Plan Fixes

Run tests **once** and collect all debug output:

```bash
just -f devtools/tinybots/local/Justfile test-<repo>
# Search for [DEBUG_FIX_1], [DEBUG_FIX_2], etc. in output
```

**After collecting logs:**

1. Search output for each `[DEBUG_FIX_N]` anchor
2. Analyze the issue for each failing test
3. Create a fix plan for all issues **before** implementing
4. Implement all fixes
5. Run again to verify

### Step 4: Check for Seeding Data Issues

> **CRITICAL:** Integration tests often seed data and require cleanup after each step.

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Test passes with `.only` but fails in full suite | Seeding data conflict from previous tests | Check `beforeEach`/`afterEach` hooks for proper cleanup |
| Test fails with unexpected data | Previous test didn't clean up | Add cleanup in `afterEach` or check seed data isolation |
| Random failures across runs | Race condition in data setup | Ensure seeds use unique IDs or proper sequencing |

**If a test passes with `.only` but fails in the full suite:**

1. Remove `.only` and run all tests
2. Read the **entire test file** to understand data flow between tests
3. Check `beforeAll`, `beforeEach`, `afterEach`, `afterAll` hooks
4. Verify each test cleans up its seeded data properly

### Step 5: Read Full Test File for Context

> **IMPORTANT:** When fixing tests, **ALWAYS read the entire test file**, not just the failing test case.

Why this matters:

- Understand shared setup/teardown logic in hooks
- See how test data is seeded and expected to be cleaned
- Identify dependencies between test cases
- Spot patterns that might affect your failing test

```javascript
// Before fixing, make sure you understand:
// 1. What beforeAll/beforeEach seeds
// 2. What afterEach/afterAll cleans up
// 3. What other tests might be modifying shared state
```

### Cleanup Checklist

After fixing the test:

- [ ] Remove `.only` from the test
- [ ] Remove all debug `console.log` statements (search for your anchor)
- [ ] Run the full test suite to verify no regressions
- [ ] Verify cleanup hooks are properly implemented

## Running Tests

> **IMPORTANT:** All TinyBots tests must run inside Docker containers via `just` commands.
> See `devdocs/agent/rules/tinybots/run-tests.md` for execution instructions.

```bash
# Run tests for a specific repository
just -f devtools/tinybots/local/Justfile test-<repo>
```
