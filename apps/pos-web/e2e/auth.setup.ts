import { expect, test as setup } from '@playwright/test';

const AUTH_FILE = 'playwright/.auth/user.json';

// Logs in once via the real UI flow and persists the NextAuth session cookie.
// All browser projects reuse this storageState so specs land on protected routes.
setup('authenticate', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/correo|email/i).fill('owner@coffeedemo.mx');
  await page.getByLabel(/contraseña|password/i).fill('password123');
  await page
    .getByRole('button', { name: /iniciar sesión|entrar|login/i })
    .click();

  // Generous timeout: first login on a cold dev server compiles routes on demand
  await page.waitForURL(/\/(dashboard|pos)/, { timeout: 45_000 });
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: AUTH_FILE });
});
