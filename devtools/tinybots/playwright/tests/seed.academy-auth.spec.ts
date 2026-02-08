import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const BASE_URL =
  process.env.ACADEMY_BASE_URL ?? 'https://dashadmin.tinybots.academy';
const STORAGE_STATE_PATH =
  process.env.ACADEMY_STORAGE_STATE_PATH ??
  path.join(os.homedir(), '.playwright', 'academy.storageState.json');

test.describe.configure({ mode: 'serial' });

test('seed academy auth storageState (manual)', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const msButton = page.getByRole('button', { name: /log in with microsoft/i });
  const msLink = page.getByRole('link', { name: /log in with microsoft/i });
  if (await msButton.count()) {
    await msButton.first().click();
  } else if (await msLink.count()) {
    await msLink.first().click();
  }

  await page.pause();

  await expect(page).toHaveURL(
    new RegExp(`^${BASE_URL.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`),
    {
      timeout: 60_000,
    },
  );

  await fs.promises.mkdir(path.dirname(STORAGE_STATE_PATH), {
    recursive: true,
  });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
});
