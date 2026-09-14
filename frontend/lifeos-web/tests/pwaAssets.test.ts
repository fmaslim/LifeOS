import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('manifest defines an installable standalone LifeOS shell', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/#/dashboard')
  assert.ok(manifest.icons.length >= 2)
})

test('service worker limits caching to same-origin static GET requests', async () => {
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  assert.match(worker, /request\.method !== 'GET'/)
  assert.match(worker, /url\.origin !== self\.location\.origin/)
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/)
  assert.match(worker, /request\.mode === 'navigate'/)
})
