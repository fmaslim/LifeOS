import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/#/dashboard')
  await page.evaluate(() => localStorage.clear())
})

test('navigates across the major LifeOS workspaces', async ({ page }) => {
  const routes = [
    ['today', /Good (morning|afternoon|evening)/i], ['tasks', 'Tasks'], ['goals', 'Goals'], ['calendar', 'Calendar'],
    ['notes', 'Notes'], ['content', 'YouTube Content Generator'], ['automations', 'Automations'], ['routines', 'Routines'], ['planning', 'Planning'], ['backups', 'Backups'], ['settings', 'Settings'],
  ] as const
  for (const [route, heading] of routes) {
    await page.goto(`/#/${route}`)
    await expect(page.locator('main h1').first()).toHaveText(heading)
    await expect(page.locator(`nav a[href="#/${route}"]`)).toHaveAttribute('aria-current', 'page')
  }
})

test('persists a newly created task after reload', async ({ page }) => {
  await page.goto('/#/tasks')
  await page.getByRole('button', { name: '+ New task' }).click()
  await page.getByLabel('Title').fill('E2E persistent task')
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect(page.getByText('E2E persistent task')).toBeVisible()
  await page.reload()
  await expect(page.getByText('E2E persistent task')).toBeVisible()
})

test('persists note capture and goal milestone changes', async ({ page }) => {
  await page.goto('/#/notes')
  await page.getByRole('button', { name: '+ Quick capture' }).click()
  await page.getByLabel('Title').fill('E2E saved note')
  await page.getByRole('textbox', { name: 'Note', exact: true }).fill('Local-first persistence smoke test')
  await page.getByRole('button', { name: 'Save note' }).click()
  await page.reload()
  await expect(page.getByText('E2E saved note')).toBeVisible()

  await page.goto('/#/goals')
  const milestone = page.locator('.milestone:not([disabled])').first()
  const before = await milestone.getAttribute('aria-pressed')
  await milestone.click()
  await page.reload()
  await expect(page.locator('.milestone:not([disabled])').first()).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true')
})

test('persists routine step completion after reload without duplicating instances', async ({ page }) => {
  await page.goto('/#/routines')
  const instances = page.locator('.routine-instance-list .routine-instance')
  const step = page.locator('.routine-step', { hasText: 'Make the bed' }).first()
  await expect(step.getByRole('button', { name: 'Complete' })).toBeVisible()
  const instanceCountBefore = await instances.count()
  await step.getByRole('button', { name: 'Complete' }).click()
  await expect(step.getByText('✓ Done')).toBeVisible()
  await page.reload()
  const stepAfterReload = page.locator('.routine-step', { hasText: 'Make the bed' }).first()
  await expect(stepAfterReload.getByText('✓ Done')).toBeVisible()
  // Reload re-runs ensureScheduledInstances(); today's instances must not be duplicated.
  await expect(instances).toHaveCount(instanceCountBefore)
})

test('persists a new project dependency after reload', async ({ page }) => {
  await page.goto('/#/planning')
  await page.getByPlaceholder('Why is this blocking?').fill('E2E dependency reason')
  await page.getByRole('button', { name: 'Add dependency' }).click()
  await expect(page.getByText('E2E dependency reason')).toBeVisible()
  await page.reload()
  await expect(page.getByText('E2E dependency reason')).toBeVisible()
})

test('creates a backup, verifies its integrity, and keeps it after reload', async ({ page }) => {
  await page.goto('/#/backups')
  await page.getByRole('button', { name: 'Run backup now' }).click()
  const card = page.locator('.backup-card').first()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Verify integrity' }).click()
  await expect(card.locator('dd.verified')).toBeVisible()
  await page.reload()
  await expect(page.locator('.backup-card').first()).toBeVisible()
})

test('persists dashboard visibility preferences', async ({ page }) => {
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Customize dashboard' }).click()
  await page.getByRole('checkbox', { name: /^Recent activity/ }).uncheck()
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toHaveCount(0)
})
