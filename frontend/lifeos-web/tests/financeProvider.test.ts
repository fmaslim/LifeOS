import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const provider = readFileSync(join(process.cwd(), 'src/services/FinanceProviderService.ts'), 'utf8')
const backed = readFileSync(join(process.cwd(), 'src/services/ProviderBackedFinancesService.ts'), 'utf8')
const registry = readFileSync(join(process.cwd(), 'src/services/serviceRegistry.ts'), 'utf8')
const gate = readFileSync(join(process.cwd(), 'src/components/AuthGate.tsx'), 'utf8')
const backend = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Integrations/FinanceProvider.cs'), 'utf8')

test('finance provider maps balances bills spending cash flow debt and investments', () => {
  assert.match(provider, /Account balances/)
  assert.match(provider, /Categorized spending/)
  assert.match(provider, /Investments/)
  assert.match(provider, /debtPayments/)
  assert.match(provider, /cashFlow/)
  assert.match(registry, /ProviderBackedFinancesService/)
})

test('finance integration is read-only and exposes no money-moving actions', () => {
  assert.match(backend, /MapGet\("\/api\/finance\/summary"/)
  assert.doesNotMatch(backend, /MapPost|MapPut|MapDelete/)
  assert.doesNotMatch(provider, /transfer|trade|payment|sendMoney/i)
})

test('important finance signals reach shared surfaces and KPI persistence', () => {
  assert.match(backed, /activity\.publish/)
  assert.match(backed, /notifications\.publish/)
  assert.match(backed, /storageKeys\.kpis/)
  assert.match(registry, /publishFinanceSignals/)
})

test('finance states degrade safely and credentials stay server-side', () => {
  assert.match(provider, /'connected'.*'disconnected'.*'unauthorized'.*'rate-limited'.*'stale'.*'unavailable'/s)
  assert.match(gate, /financeProviderService\.refresh/)
  assert.match(backend, /Integrations:Finance:Credential/)
  assert.doesNotMatch(provider, /Bearer|ApiKey|accessToken|secretValue/i)
})
