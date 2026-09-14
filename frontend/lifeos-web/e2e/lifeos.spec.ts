import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/#/dashboard')
  await page.evaluate(() => localStorage.clear())
})

test('navigates across the major LifeOS workspaces', async ({ page }) => {
  const routes = [
    ['today', /Good (morning|afternoon|evening)/i], ['tasks', 'Tasks'], ['goals', 'Goals'], ['calendar', 'Calendar'],
    ['notes', 'Notes'], ['content', 'YouTube Content Generator'], ['automations', 'Automations'], ['settings', 'Settings'],
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

test('persists dashboard visibility preferences', async ({ page }) => {
  await page.goto('/#/dashboard')
  await page.getByRole('button', { name: 'Customize dashboard' }).click()
  await page.getByRole('checkbox', { name: /^Recent activity/ }).uncheck()
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toHaveCount(0)
})
