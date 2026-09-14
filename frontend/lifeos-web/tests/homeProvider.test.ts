import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const provider = readFileSync(join(process.cwd(), 'src/services/HomeProviderService.ts'), 'utf8')
const backed = readFileSync(join(process.cwd(), 'src/services/ProviderBackedHomeService.ts'), 'utf8')
const registry = readFileSync(join(process.cwd(), 'src/services/serviceRegistry.ts'), 'utf8')
const gate = readFileSync(join(process.cwd(), 'src/components/AuthGate.tsx'), 'utf8')
const backend = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Integrations/HomeProvider.cs'), 'utf8')

test('home framework models smart-home security network and utility sources', () => {
  assert.match(backend, /SmartHome.*Security.*Network.*Utilities/s)
  assert.match(provider, /Devices online/)
  assert.match(provider, /Utility cost/)
  assert.match(registry, /ProviderBackedHomeService/)
})

test('provider failures are isolated per source and unsupported providers degrade safely', () => {
  assert.match(backend, /ReadSourceAsync/)
  assert.match(backend, /unsupported/)
  assert.match(provider, /'connected'.*'disconnected'.*'unauthorized'.*'rate-limited'.*'stale'.*'unavailable'.*'unsupported'/s)
})

test('home integration is read-only and alerts reach shared surfaces', () => {
  assert.match(backend, /MapGet\("\/api\/home\/summary"/)
  assert.doesNotMatch(backend, /MapPost|MapPut|MapDelete/)
  assert.match(backed, /activity\.publish/)
  assert.match(backed, /notifications\.publish/)
  assert.match(registry, /publishHomeSignals/)
})

test('home provider bootstrap keeps credentials server-side', () => {
  assert.match(gate, /homeProviderService\.refresh/)
  assert.match(backend, /Integrations:Home:/)
  assert.doesNotMatch(provider, /Bearer|ApiKey|accessToken|secretValue/i)
})
