const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3939';

// Bypass Firebase auth by returning an empty config
async function bypassAuth(page) {
  await page.route('**/config.js', route => {
    route.fulfill({
      contentType: 'text/javascript',
      body: 'const firebaseConfig = {};',
    });
  });
}

// Ensure clean localStorage state
async function clearState(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

// Listen for alert() dialogs — none should fire
function watchForAlerts(page, alerts) {
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });
}

// ----- WELCOME OVERLAY (dashboard, no API key) -----

test.describe('Onboarding: Welcome overlay', () => {
  test('shows welcome overlay when no API key is set', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await clearState(page);
    await page.goto(`${BASE}/dashboard.html`);

    const backdrop = page.locator('.onboard-backdrop');
    const welcome = page.locator('.onboard-welcome');
    await expect(backdrop).toBeVisible();
    await expect(welcome).toBeVisible();
    await expect(welcome.locator('h2')).toHaveText('Welcome to onsite.');
    await expect(welcome.locator('.onboard-cta')).toBeVisible();
  });

  test('does NOT show welcome overlay when API key exists', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('interview-prep-api', JSON.stringify({ provider: 'claude', key: 'sk-ant-test-1234567890' }));
    });
    await page.goto(`${BASE}/dashboard.html`);

    await expect(page.locator('.onboard-welcome')).not.toBeVisible();
    await expect(page.locator('.onboard-backdrop')).not.toBeVisible();
  });

  test('does NOT show welcome overlay if already onboarded', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('interview-prep-onboarded', '1');
    });
    await page.goto(`${BASE}/dashboard.html`);

    await expect(page.locator('.onboard-welcome')).not.toBeVisible();
  });

  test('clicking "Set up AI provider" navigates to settings with setup=1', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await clearState(page);
    await page.goto(`${BASE}/dashboard.html`);

    await expect(page.locator('.onboard-welcome')).toBeVisible();
    await page.locator('.onboard-cta').click();

    await page.waitForURL('**/settings.html**', { timeout: 10000 });
    // Verify onboarded flag was set
    const onboarded = await page.evaluate(() => localStorage.getItem('interview-prep-onboarded'));
    expect(onboarded).toBe('1');
  });
});

// ----- SETTINGS SETUP MODE -----

test.describe('Onboarding: Settings setup flow', () => {
  test('shows provider tag on setup mode', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html?setup=1`);

    const backdrop = page.locator('#setupBackdrop');
    await expect(backdrop).toBeVisible();

    // Provider tag should be visible
    const tag = page.locator('.onboard-tag').first();
    await expect(tag).toBeVisible();
    await expect(tag).toHaveText('Pick your AI provider');

    // Settings card should have spotlight
    await expect(page.locator('.settings-card').first()).toHaveClass(/onboard-spotlight/);
  });

  test('provider tag auto-advances to API key tag after 2.5s', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html?setup=1`);

    // Provider tag visible initially
    await expect(page.locator('.onboard-tag').first()).toHaveText('Pick your AI provider');

    // Wait for auto-advance
    await page.waitForTimeout(3000);

    // Now API key tag should be visible
    const apiTag = page.locator('#apiKeyTag');
    await expect(apiTag).toBeVisible();
    await expect(apiTag).toHaveText('Paste your API key here');

    // Provider tag should be gone
    await expect(page.locator('.onboard-tag:has-text("Pick your AI provider")')).not.toBeVisible();
  });

  test('clicking provider advances to API key tag immediately', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html?setup=1`);

    await expect(page.locator('.onboard-tag').first()).toHaveText('Pick your AI provider');

    // Click a provider
    await page.locator('.provider-card[data-provider="openai"]').click();

    // API key tag should appear immediately
    const apiTag = page.locator('#apiKeyTag');
    await expect(apiTag).toBeVisible({ timeout: 2000 });
    await expect(apiTag).toHaveText('Paste your API key here');
  });

  test('entering API key shows "You\'re all set" tag', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html?setup=1`);

    // Wait for API key step
    await page.waitForTimeout(3000);
    await expect(page.locator('#apiKeyTag')).toBeVisible();

    // Type an API key
    await page.locator('#apiKey').fill('sk-ant-test-1234567890');

    // "You're all set" tag should appear
    const doneTag = page.locator('.onboard-tag:has-text("You\'re all set")');
    await expect(doneTag).toBeVisible();

    // Backdrop should be gone
    await expect(page.locator('#setupBackdrop')).not.toBeVisible();

    // API key tag should be gone
    await expect(page.locator('#apiKeyTag')).not.toBeVisible();

    // Continue button should be present
    await expect(doneTag.locator('.onboard-continue')).toBeVisible();
  });

  test('"Go to Dashboard" navigates to dashboard with welcome=1', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html?setup=1`);

    await page.waitForTimeout(3000);
    await page.locator('#apiKey').fill('sk-ant-test-1234567890');

    const continueBtn = page.locator('.onboard-continue');
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    await page.waitForURL('**/dashboard.html**', { timeout: 10000 });
  });

  test('settings page without setup=1 does NOT show onboarding', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html`);

    await expect(page.locator('#setupBackdrop')).not.toBeVisible();
    await expect(page.locator('.onboard-tag')).not.toBeVisible();
  });
});

// ----- DASHBOARD: NEW PREP TAG (post-setup) -----

test.describe('Onboarding: New Prep tag', () => {
  test('shows New Prep tag when arriving with ?welcome=1', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await page.evaluate(() => {
      localStorage.setItem('interview-prep-api', JSON.stringify({ provider: 'claude', key: 'sk-ant-test-1234567890' }));
      localStorage.setItem('interview-prep-onboarded', '1');
    });
    await page.goto(`${BASE}/dashboard.html?welcome=1`);

    // Wait for the 300ms setTimeout + render
    const tag = page.locator('.onboard-tag');
    await expect(tag).toBeVisible({ timeout: 3000 });
    await expect(tag).toContainText('Create your first interview prep');

    // "+ New Prep" button should have spotlight
    const btn = page.locator('.dashboard-actions .dash-btn.primary');
    await expect(btn).toHaveClass(/onboard-spotlight/);
    await expect(btn).toHaveClass(/onboard-pulse/);

    // Backdrop should be visible
    await expect(page.locator('.onboard-backdrop')).toBeVisible();
  });

  test('clicking backdrop dismisses the New Prep tag', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await page.evaluate(() => {
      localStorage.setItem('interview-prep-api', JSON.stringify({ provider: 'claude', key: 'sk-ant-test-1234567890' }));
      localStorage.setItem('interview-prep-onboarded', '1');
    });
    await page.goto(`${BASE}/dashboard.html?welcome=1`);

    const tag = page.locator('.onboard-tag');
    await expect(tag).toBeVisible({ timeout: 3000 });

    // Click backdrop to dismiss
    await page.locator('.onboard-backdrop').click({ force: true });

    await expect(tag).not.toBeVisible();
    await expect(page.locator('.onboard-backdrop')).not.toBeVisible();

    const btn = page.locator('.dashboard-actions .dash-btn.primary');
    await expect(btn).not.toHaveClass(/onboard-spotlight/);
    await expect(btn).not.toHaveClass(/onboard-pulse/);
  });

  test('URL is cleaned after ?welcome=1 is processed', async ({ page }) => {
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await page.evaluate(() => {
      localStorage.setItem('interview-prep-api', JSON.stringify({ provider: 'claude', key: 'sk-ant-test-1234567890' }));
      localStorage.setItem('interview-prep-onboarded', '1');
    });
    await page.goto(`${BASE}/dashboard.html?welcome=1`);
    await page.waitForTimeout(500);

    // URL should be cleaned
    expect(page.url()).not.toContain('welcome=1');
  });
});

// ----- TOAST SYSTEM (no more alert()) -----

test.describe('Toast notifications (no browser alerts)', () => {
  test('file validation shows toast, not alert', async ({ page }) => {
    const alerts = [];
    watchForAlerts(page, alerts);
    await bypassAuth(page);
    await page.goto(`${BASE}/dashboard.html`);
    await page.evaluate(() => {
      localStorage.setItem('interview-prep-api', JSON.stringify({ provider: 'claude', key: 'sk-ant-test-1234567890' }));
      localStorage.setItem('interview-prep-onboarded', '1');
    });
    await page.goto(`${BASE}/dashboard.html`);

    // Open new prep form
    await page.locator('.dashboard-actions .dash-btn.primary').click();
    await expect(page.locator('#newPrepForm')).toHaveClass(/active/);

    // Click Create without uploading files
    await page.locator('.form-actions .dash-btn.primary').click();

    // Should see toast, not alert
    const toast = page.locator('.toast');
    await expect(toast.first()).toBeVisible({ timeout: 2000 });

    expect(alerts).toHaveLength(0);
  });

  test('import invalid file shows toast, not alert', async ({ page }) => {
    const alerts = [];
    watchForAlerts(page, alerts);
    await bypassAuth(page);
    await page.goto(`${BASE}/settings.html`);

    // Create a fake invalid JSON file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('label.dash-btn:has-text("Import") input[type="file"]').evaluate(el => el.click()),
    ]);

    const buffer = Buffer.from('not valid json', 'utf-8');
    await fileChooser.setFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer,
    });

    const toast = page.locator('.toast');
    await expect(toast.first()).toBeVisible({ timeout: 2000 });

    expect(alerts).toHaveLength(0);
  });
});

// ----- FULL E2E FLOW -----

test.describe('Onboarding: Full end-to-end flow', () => {
  test('complete onboarding journey from first login to dashboard', async ({ page }) => {
    const alerts = [];
    watchForAlerts(page, alerts);
    await bypassAuth(page);

    // Step 1: Land on dashboard with no state
    await page.goto(`${BASE}/dashboard.html`);
    await clearState(page);
    await page.goto(`${BASE}/dashboard.html`);

    // Welcome overlay should appear
    await expect(page.locator('.onboard-welcome')).toBeVisible();
    await expect(page.locator('.onboard-welcome h2')).toHaveText('Welcome to onsite.');

    // Step 2: Click "Set up AI provider"
    await page.locator('.onboard-cta').click();
    await page.waitForURL('**/settings.html**', { timeout: 10000 });

    // Step 3: Settings setup — provider tag should be visible
    const providerTag = page.locator('.onboard-tag:has-text("Pick your AI provider")');
    await expect(providerTag).toBeVisible();
    await expect(page.locator('#setupBackdrop')).toBeVisible();

    // Step 4: Click a provider
    await page.locator('.provider-card[data-provider="deepseek"]').click();

    // Step 5: API key tag should appear
    const apiKeyTag = page.locator('#apiKeyTag');
    await expect(apiKeyTag).toBeVisible({ timeout: 2000 });
    await expect(apiKeyTag).toHaveText('Paste your API key here');
    await expect(providerTag).not.toBeVisible();

    // Step 6: Enter API key
    await page.locator('#apiKey').fill('sk-test-abcdef123456');

    // Step 7: "You're all set" should appear
    const doneTag = page.locator('.onboard-tag:has-text("You\'re all set")');
    await expect(doneTag).toBeVisible();
    await expect(apiKeyTag).not.toBeVisible();
    await expect(page.locator('#setupBackdrop')).not.toBeVisible();

    // Step 8: Click "Go to Dashboard"
    await doneTag.locator('.onboard-continue').click();
    await page.waitForURL('**/dashboard.html**', { timeout: 10000 });

    // Step 9: New Prep tag should appear
    const newPrepTag = page.locator('.onboard-tag');
    await expect(newPrepTag).toBeVisible({ timeout: 3000 });
    await expect(newPrepTag).toContainText('Create your first interview prep');

    // Step 10: Click the New Prep button to dismiss and open form
    await page.locator('.dashboard-actions .dash-btn.primary').click();
    await expect(newPrepTag).not.toBeVisible();
    await expect(page.locator('#newPrepForm')).toHaveClass(/active/);

    // No browser alerts should have fired during the entire flow
    expect(alerts).toHaveLength(0);
  });
});
