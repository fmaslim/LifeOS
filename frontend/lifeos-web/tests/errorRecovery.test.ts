import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeDiagnostic } from '../src/errors/errorDiagnostics.ts'
import { resolveSafeRoute } from '../src/routing/routeSafety.ts'

test('sanitizes development diagnostics without leaking sensitive values', () => {
  const result = sanitizeDiagnostic('token=abc123 user@example.com https://example.com/private?apiKey=nope')
  assert.doesNotMatch(result, /abc123|user@example|example\.com|nope/)
  assert.match(result, /\[redacted\]|\[email\]|\[url\]/)
})

test('routes known hashes and safely falls back from component-route failures', () => {
  const supported = ['dashboard', 'tasks', 'settings'] as const
  assert.equal(resolveSafeRoute('#/tasks?view=today', supported), 'tasks')
  assert.equal(resolveSafeRoute('#/missing', supported), 'dashboard')
  assert.equal(resolveSafeRoute('', supported), 'dashboard')
})
