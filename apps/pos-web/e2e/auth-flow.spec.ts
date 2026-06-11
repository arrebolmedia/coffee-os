import { expect, type Page, test } from '@playwright/test';

// All tests in this file run WITHOUT the shared storageState from auth.setup.ts
// so we can exercise the unauthenticated / login flows from scratch.
test.use({ storageState: { cookies: [], origins: [] } });

const VALID_EMAIL = 'owner@coffeedemo.mx';
const VALID_PASSWORD = 'password123';

// Fills the credentials and submits. Under heavy parallel load the login page
// hydrates late and React resets the inputs to the dev-prefilled demo values,
// silently discarding anything typed before hydration. Callers wrap this in
// expect(...).toPass() so the whole attempt is retried after hydration.
async function submitLogin(page: Page, email: string, password: string) {
  const emailInput = page.getByLabel(/correo|email/i);
  const passwordInput = page.getByLabel(/contraseña|password/i);

  await emailInput.fill(email);
  await passwordInput.fill(password);
  // If hydration already reverted our values, bail out so toPass() retries.
  await expect(emailInput).toHaveValue(email, { timeout: 2_000 });

  await page
    .getByRole('button', { name: /iniciar sesión|entrar|login/i })
    .click();
}

test.describe('Auth Flow', () => {
  // Login flows go through the Next dev server, which gets slow when other
  // workers compile pages in parallel — allow triple the default timeout.
  test.slow();

  test('rejects invalid credentials and stays on /login', async ({ page }) => {
    await page.goto('/login');

    const errorToast = page.getByText(/Credenciales inválidas/i);

    // Retry the full attempt: late hydration can swallow the first submit.
    await expect(async () => {
      await submitLogin(page, 'nadie@coffeedemo.mx', 'wrong-password-123');
      // Error surfaces as a react-hot-toast: "Credenciales inválidas"
      await expect(errorToast).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 60_000 });

    // Still on the login page (no redirect happened)
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated access to /pos back to /login', async ({
    page,
  }) => {
    await page.goto('/pos');

    // next-auth middleware should bounce us to the sign-in page
    await page.waitForURL(/\/login/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('button', { name: /iniciar sesión|entrar|login/i }),
    ).toBeVisible();
  });

  test('sanitizes malicious callbackUrl (no open redirect)', async ({
    page,
  }) => {
    // sanitizeCallbackUrl() in src/app/login/page.tsx only accepts relative
    // paths, so an absolute external URL must fall back to /dashboard.
    await page.goto('/login?callbackUrl=https://evil.com');

    // Retry the full attempt: late hydration can swallow the first submit.
    await expect(async () => {
      if (new URL(page.url()).pathname.startsWith('/login')) {
        await submitLogin(page, VALID_EMAIL, VALID_PASSWORD);
      }
      // Wait until we leave /login after a successful sign-in
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: 15_000,
      });
    }).toPass({ timeout: 90_000 });

    const finalUrl = new URL(page.url());
    // The final URL must stay on the same origin — never evil.com
    expect(finalUrl.origin).toBe('http://localhost:3001');
    expect(finalUrl.hostname).not.toContain('evil.com');
  });
});
