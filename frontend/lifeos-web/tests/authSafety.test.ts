import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), 'src')
const mainSource = readFileSync(join(root, 'main.tsx'), 'utf8')
const authServiceSource = readFileSync(join(root, 'services/AuthService.ts'), 'utf8')
const backendRoot = join(process.cwd(), '../../backend/LifeOS.Api')
const authHandlerSource = readFileSync(join(backendRoot, 'Auth/LifeOSAuthenticationHandler.cs'), 'utf8')
const programSource = readFileSync(join(backendRoot, 'Program.cs'), 'utf8')

test('private frontend is wrapped by the authentication gate', () => {
  assert.match(mainSource, /<AuthGate>/)
  assert.match(mainSource, /<App \/>/)
})

test('browser auth uses HttpOnly server sessions instead of token storage', () => {
  assert.match(authServiceSource, /credentials: 'include'/)
  assert.doesNotMatch(authServiceSource, /localStorage|sessionStorage|token\s*=/i)
  assert.match(authHandlerSource, /CookieName = "lifeos_session"/)
})

test('protected backend integration endpoint independently requires authorization', () => {
  assert.match(programSource, /UseAuthentication\(\)/)
  assert.match(programSource, /UseAuthorization\(\)/)
  assert.match(programSource, /integrations\/credentials[\s\S]*RequireAuthorization\(\)/)
})
