import assert from 'node:assert/strict'
import test from 'node:test'
import { MockIntegrationProviderService } from '../src/services/IntegrationProviderService.ts'

test('exposes unique typed mock providers for every planned domain', () => {
  const providers = new MockIntegrationProviderService().listProviders()
  assert.deepEqual(providers.map(provider => provider.metadata.id), ['jarvis', 'dociq', 'youtube', 'github', 'calendar', 'finance', 'health', 'smart-home'])
  assert.equal(new Set(providers.map(provider => provider.metadata.id)).size, providers.length)
})

test('defaults adapters to safe disconnected health with metadata-only credential status', () => {
  const providers = new MockIntegrationProviderService().listProviders()
  for (const provider of providers) {
    assert.equal(provider.connection, 'not-configured')
    assert.equal(provider.health, 'unknown')
    assert.equal(provider.capabilities.actions, false)
    assert.equal(provider.credential.state, 'missing')
    assert.doesNotMatch(JSON.stringify(provider), /password|token|secret|apiKey|credentialValue/i)
  }
})
