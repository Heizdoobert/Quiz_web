import { test, expect } from '@playwright/test';

test('has title and renders quiz UI', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Web3 & Crypto Knowledge Trivia/i);

  // Check if main UI elements are rendered
  await expect(page.locator('text=Web3 & Crypto Knowledge Trivia')).toBeVisible();

  // Categories should be visible
  await expect(page.getByRole('button', { name: 'All' })).toBeVisible();

  // The sidebar or stats block should appear
  await expect(page.locator('text=Global Top')).toBeVisible();
});
