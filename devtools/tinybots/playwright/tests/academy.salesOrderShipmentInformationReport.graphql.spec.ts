import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const STORAGE_STATE_PATH =
  process.env.ACADEMY_STORAGE_STATE_PATH ??
  path.join(os.homedir(), '.playwright', 'academy.storageState.json');

const QUERY = `query MyQuery {
  reports {
    allReports {
      salesOrderShipmentInformationReport(relationIds: [159]) {
        boxNumber
        clientNumber
        deliveryAddressHomeNumber
        deliveryAddressCity
        deliveryAddressHomeNumberExtension
        deliveryAddressLocationDescription
        deliveryAddressRecipient
        deliveryAddressStreet
        deliveryAddressZipcode
        organisationName
        requesterEmail
        shippedAt
        tessaExpertNeeded
        trackTraceCode
      }
    }
  }
}`;

test('academy GraphQL salesOrderShipmentInformationReport', async ({
  page,
}) => {
  test.setTimeout(120_000);
  test.skip(
    !fs.existsSync(STORAGE_STATE_PATH),
    'Run pnpm run seed:academy to generate storageState',
  );

  await test.step('Verify logged in via storageState', async () => {
    await page.goto('/overview/', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 30_000 });
    await expect(
      page.getByPlaceholder(/search for relation or serial/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  await test.step('Open GraphiQL query creator', async () => {
    await page.goto('/custom-query-page', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 30_000 });
    const executeButton = page
      .locator('#graphiql button.graphiql-execute-button')
      .or(page.getByRole('button', { name: /execute query/i }));
    await expect(executeButton).toBeVisible({ timeout: 30_000 });
  });

  await test.step('Execute query and verify GraphQL response', async () => {
    const executeButton = page
      .locator('#graphiql button.graphiql-execute-button')
      .or(page.getByRole('button', { name: /execute query/i }));

    const queryEditor = page
      .locator('#graphiql section.graphiql-query-editor textarea')
      .first();

    await queryEditor.focus({ timeout: 30_000 });
    await page.keyboard.press(
      process.platform === 'darwin' ? 'Meta+A' : 'Control+A',
    );
    await page.keyboard.insertText(QUERY);

    const graphqlResponsePromise = page.waitForResponse(
      (res) => {
        if (!res.url().includes('/v4/dashboard/graphql')) return false;
        const req = res.request();
        if (req.method() !== 'POST') return false;
        const post = req.postData() ?? '';
        return (
          post.includes('salesOrderShipmentInformationReport') &&
          res.status() === 200
        );
      },
      { timeout: 60_000 },
    );

    await executeButton.click();

    const graphqlResponse = await graphqlResponsePromise;
    const graphqlJson = await graphqlResponse.json();
    expect(graphqlJson).toBeTruthy();
    expect(graphqlJson.errors).toBeFalsy();
    const reportRows =
      graphqlJson.data?.reports?.allReports
        ?.salesOrderShipmentInformationReport;
    expect(Array.isArray(reportRows)).toBeTruthy();
    expect(reportRows?.length).toBeGreaterThan(0);
  });

  if (process.env.ACADEMY_MANUAL === '1') {
    await page.pause();
  }
});
