import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('shell exposes skip navigation, landmarks, and current-page state', async () => {
  const [main, app] = await Promise.all([readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'), readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')])
  assert.match(main, /className="skip-link"/)
  assert.match(app, /aria-label="Primary navigation"/)
  assert.match(app, /aria-current=/)
  assert.match(app, /id="main-content"/)
})

test('interactive overlays identify dialogs and keyboard dismissal', async () => {
  const [palette, notifications] = await Promise.all([readFile(new URL('../src/components/CommandPalette.tsx', import.meta.url), 'utf8'), readFile(new URL('../src/components/NotificationCenter.tsx', import.meta.url), 'utf8')])
  assert.match(palette, /aria-modal="true"/)
  assert.match(palette, /event\.key !== 'Tab'/)
  assert.match(notifications, /aria-haspopup="dialog"/)
  assert.match(notifications, /event\.key === 'Escape'/)
})

test('global styles include visible focus and reduced-motion behavior', async () => {
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.match(styles, /:focus-visible/)
  assert.match(styles, /prefers-reduced-motion:reduce/)
})
