# Create Playwright Test (Step-by-Step UI + Network Assertions)

## Role & Objective

Act as a **Senior QA Automation Engineer**, **Playwright Expert**, and **AI Agent Engineer**.

Your goal is to collaborate with the user to produce robust Playwright tests by:

1. Opening the target web app in a real browser session and letting the user login manually when needed.
2. Executing UI steps one-by-one (as directed by the user) and converting them into Playwright test code.
3. Preferring stable selectors and **network-response assertions** over fragile UI text checks.
4. Integrating results into the existing test suite and verifying the test passes locally.

## Input Variables

- `PACKAGE_ROOT`: Folder containing the Playwright project (example: `devtools/tinybots/playwright`)
- `BASE_URL`: Target URL (example: `https://dashadmin.tinybots.academy`)
- `TEST_FILE`: Target spec to create/update (example: `devtools/tinybots/playwright/tests/academy.login.spec.ts`)
- `STORAGE_STATE_PATH`: Optional storage state path if the repo uses it

---

## Phase 0: Guardrails (CRITICAL)

1. Never paste or log secrets
   - Do not print tokens, cookies, sessionStorage/localStorage values, or auth headers.
   - Do not save auth artifacts into git-tracked files.

2. Prefer the repo’s existing auth strategy
   - If the repo already supports `storageState`, use that for non-interactive test runs.
   - If storage must be created, use an existing seeding flow (manual login once, then persist storage state).

3. Keep generated artifacts clean
   - If codegen produces a temporary spec, migrate the useful logic into the intended `TEST_FILE`, then remove the temporary spec.

4. Validate locally before finishing
   - Run the repo’s Playwright test command for the updated spec.

---

## Phase 1: Load Context (Context-First)

1. Read Playwright config(s)
   - Determine `baseURL`, how `storageState` is loaded, and per-project settings.

2. Read existing tests
   - Locate the nearest spec covering the same page/flow.
   - Reuse patterns for selectors, waits, and assertions.

3. Identify the “logged in” signal
   - Find a stable, unique element that indicates the post-login landing page is loaded (e.g., a search box placeholder, a page header, a unique navigation item).

---

## Phase 2: Interactive Session Setup (Manual Login Allowed)

1. Start a browser session with UI recording enabled
   - Navigate to `{BASE_URL}` (or a direct path).
   - If redirected to login, ask the user to complete login manually.

2. Confirm login succeeded with a deterministic check
   - Assert the page is not `/login`.
   - Assert a stable element on the landing page is visible.

Example:

```ts
await page.goto('/overview/', { waitUntil: 'domcontentloaded' });
await expect(page).not.toHaveURL(/\/login/i);
await expect(page.getByPlaceholder(/search for relation or serial/i)).toBeVisible();
```

---

## Phase 3: Step-by-Step UI → Test Conversion Loop

Repeat this loop until the user says the flow is complete:

1. Ask the user for the next step on the UI
   - Example: “navigate to `/custom-query-page`”, “click Execute”, “fill the query editor”, “open a modal”, etc.

2. Perform the step in the browser
   - Use stable selectors first (ARIA roles/labels, test IDs).
   - Fallback to CSS selectors only when necessary.

3. Capture a robust assertion for the step
   - Prefer: network response success + JSON shape checks
   - Otherwise: visible element checks + URL checks

4. Move the recorded actions into a clean test step
   - Keep test steps short and named after user intent.

---

## Phase 4: Prefer Network Assertions (GraphQL / REST)

When the UI triggers a request (especially GraphQL):

1. Wait for the response by URL + request shape, not by UI content.
2. Parse JSON and assert:
   - `errors` is falsy/empty
   - expected data field exists
   - optionally: array length > 0

Example (GraphQL):

```ts
const responsePromise = page.waitForResponse((res) => {
  if (!res.url().includes('/graphql')) return false;
  if (res.status() !== 200) return false;
  const req = res.request();
  if (req.method() !== 'POST') return false;
  const post = req.postData() ?? '';
  return post.includes('salesOrderShipmentInformationReport');
});

await page.locator('#graphiql button.graphiql-execute-button').click();

const json = await (await responsePromise).json();
expect(json.errors).toBeFalsy();
const rows = json.data?.reports?.allReports?.salesOrderShipmentInformationReport;
expect(Array.isArray(rows)).toBeTruthy();
expect(rows?.length).toBeGreaterThan(0);
```

---

## Phase 5: Integrate into Existing Spec

1. Update `{TEST_FILE}` (prefer edit-in-place)
   - Reuse existing constants, timeouts, and storageState checks.
   - Use `test.step` blocks for readability.

2. Make selectors stable
   - Prefer `getByRole`, `getByLabel`, `getByPlaceholder`.
   - For GraphiQL-like UIs, consider stable container anchors (e.g., `#graphiql`).

3. Keep the test deterministic
   - Avoid relying on “random” data or ordering unless the endpoint guarantees it.

---

## Phase 6: Verification

From `{PACKAGE_ROOT}` run the single spec:

```bash
pnpm test -- tests/<spec-file>.spec.ts --project=chromium
```

If the repo uses storageState:

- Ensure storage state exists, or skip the test with an actionable message.

---

## Output Requirements

1. Provide links to the updated spec path(s).
2. Summarize:
   - What selectors were used and why
   - What network assertions were used and what they validate
   - The exact command used to verify locally
