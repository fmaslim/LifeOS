import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const apiRoot = join(process.cwd(), '../../backend/LifeOS.Api')
const credentialSource = readFileSync(join(apiRoot, 'Integrations/CredentialStatus.cs'), 'utf8')

test('public credential status contract cannot expose credential values', () => {
  const contract = credentialSource.match(/public sealed record CredentialStatus\(([^)]*)\)/)?.[1] ?? ''
  assert.match(contract, /CredentialState State/)
  assert.doesNotMatch(contract, /Value|Token|Secret|ApiKey/i)
})

test('server configuration files do not contain integration credential values', () => {
  const settings = readdirSync(apiRoot).filter(file => /^appsettings.*\.json$/.test(file))
  for (const file of settings) {
    const content = readFileSync(join(apiRoot, file), 'utf8')
    assert.doesNotMatch(content, /"(?:Credential|Token|Secret|ApiKey)"\s*:/i)
  }
})

test('credential failures use safe messages and never interpolate values', () => {
  assert.match(credentialSource, /Integration credential is unavailable\./)
  assert.doesNotMatch(credentialSource, /\$"[^"]*(?:resolution\.Value|value)/i)
})
