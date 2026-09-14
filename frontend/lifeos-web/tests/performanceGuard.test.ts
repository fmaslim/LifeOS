import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('workspace routes use lazy imports behind a suspense fallback', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.ok((app.match(/lazy\(\(\) => import\(/g) ?? []).length >= 20)
  assert.match(app, /<Suspense fallback=/)
})

test('bundle guard defines chunk count and size budgets', async () => {
  const guard = await readFile(new URL('../scripts/check-bundle.mjs', import.meta.url), 'utf8')
  assert.match(guard, /files\.length < 8/)
  assert.match(guard, /largest: 325_000/)
  assert.match(guard, /total: 1_200_000/)
})
