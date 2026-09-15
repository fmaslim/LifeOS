import assert from 'node:assert/strict'
import test from 'node:test'
import { ConfigurationDriftService } from '../src/services/ConfigurationDriftService.ts'

test('configuration drift deterministically finds missing routes stale targets and flags without exposing secrets', () => {
  const manifest = [
    { name: 'API_BASE', scope: 'frontend' as const, required: true, secret: false, expected: '/api', kind: 'stale-api-target' as const, remediation: 'Use /api.' },
    { name: 'AUTH_ROUTE', scope: 'frontend' as const, required: true, secret: false, expected: '/api/auth/session', kind: 'route-mismatch' as const, remediation: 'Fix proxy.' },
    { name: 'FEATURE_SYNC', scope: 'backend' as const, required: true, secret: false, expected: 'v2', kind: 'incompatible-feature-flag' as const, remediation: 'Align the flag.' },
    { name: 'SIGNING_KEY', scope: 'backend' as const, required: true, secret: true, remediation: 'Configure secret.' },
  ]
  const report = new ConfigurationDriftService(manifest, [{ name: 'API_BASE', scope: 'frontend', present: true, safeValue: 'https://old.example' }, { name: 'AUTH_ROUTE', scope: 'frontend', present: true, safeValue: '/' }, { name: 'FEATURE_SYNC', scope: 'backend', present: true, safeValue: 'v1' }, { name: 'SIGNING_KEY', scope: 'backend', present: false, safeValue: 'must-never-return' }]).evaluate(new Date('2026-09-15T04:00:00Z'))
  assert.deepEqual(report.findings.map(item => item.kind), ['stale-api-target', 'route-mismatch', 'incompatible-feature-flag', 'missing'])
  assert.ok(!JSON.stringify(report).includes('must-never-return'))
  assert.ok(report.findings.every(item => item.remediation.length > 0))
})

test('matching non-secret shape and secret presence are healthy', () => { const report = new ConfigurationDriftService([{ name: 'KEY', scope: 'backend', required: true, secret: true, remediation: 'set' }], [{ name: 'KEY', scope: 'backend', present: true, safeValue: 'ignored-secret' }]).evaluate(); assert.equal(report.healthy, true); assert.ok(!JSON.stringify(report).includes('ignored-secret')) })
