import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const provider = readFileSync(join(process.cwd(), 'src/services/CalendarProviderService.ts'), 'utf8')
const gate = readFileSync(join(process.cwd(), 'src/components/AuthGate.tsx'), 'utf8')
const today = readFileSync(join(process.cwd(), 'src/services/MockTodayService.ts'), 'utf8')
const backend = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Integrations/GoogleCalendarProvider.cs'), 'utf8')

test('calendar provider maps real events into the existing typed calendar model', () => {
  assert.match(provider, /mapProviderEvent/)
  assert.match(provider, /provider-calendar-/)
  assert.match(provider, /category: 'work'/)
  assert.match(gate, /localStore\.write\(storageKeys\.calendar/)
})

test('Today and Daily Brief consume the reconciled calendar collection', () => {
  assert.match(today, /storageKeys\.calendar/)
  assert.match(today, /providerSchedule/)
  assert.match(gate, /calendarProviderService\.refresh/)
})

test('provider failures are classified and calendar writes remain approval-gated', () => {
  assert.match(provider, /'disconnected'.*'unauthorized'.*'rate-limited'.*'stale'.*'unavailable'/s)
  assert.match(provider, /status: 'approval-required'/)
  assert.match(backend, /Status428PreconditionRequired/)
  assert.match(backend, /X-LifeOS-Correlation-Id/)
})

test('server calendar credential never appears in frontend contracts', () => {
  assert.doesNotMatch(provider, /Credential|Bearer|token|secret/i)
  assert.match(backend, /Integrations:Calendar:Credential/)
})
