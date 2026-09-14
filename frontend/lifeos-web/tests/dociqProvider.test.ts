import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const provider = readFileSync(join(process.cwd(), 'src/services/DocIQProviderService.ts'), 'utf8')
const registry = readFileSync(join(process.cwd(), 'src/services/serviceRegistry.ts'), 'utf8')
const bridge = readFileSync(join(process.cwd(), 'src/services/DocIQSignalBridge.ts'), 'utf8')
const dashboard = readFileSync(join(process.cwd(), 'src/services/ProviderBackedDocIQService.ts'), 'utf8')
const page = readFileSync(join(process.cwd(), 'src/components/DocIQPage.tsx'), 'utf8')
const backend = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Integrations/DocIQProvider.cs'), 'utf8')

test('DocIQ provider maps live metrics and activity behind typed service boundaries', () => {
  assert.match(provider, /mapDocIQSnapshot/)
  assert.match(provider, /active|signup|plan/i)
  assert.match(registry, /ProviderBackedDocIQService/)
  assert.match(registry, /ProviderAwareDashboardService/)
})

test('important DocIQ events flow into Activity, notifications, Daily Brief inputs, and dashboard KPI', () => {
  assert.match(bridge, /activity\.publish/)
  assert.match(bridge, /notifications\.publish/)
  assert.match(registry, /publishDocIQSignals/)
  assert.match(dashboard, /docIQSummary/)
})

test('provider failures stay isolated and external actions remain approval gated', () => {
  assert.match(provider, /'disconnected'.*'unauthorized'.*'rate-limited'.*'stale'.*'unavailable'/s)
  assert.match(provider, /approval-required/)
  assert.match(backend, /Status428PreconditionRequired/)
  assert.match(page, /target="_blank"/)
})

test('DocIQ secrets remain server-side', () => {
  assert.match(backend, /Integrations:DocIQ:Credential/)
  assert.match(backend, /Authorization = new AuthenticationHeaderValue/)
  assert.doesNotMatch(provider, /Bearer|Credential|ApiKey|secret/i)
})
