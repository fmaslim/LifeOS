import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import { parseArgs, runSmokeSuite } from '../scripts/smoke-check.mjs'

/** A tiny local HTTP server standing in for a real LifeOS deployment, so the script exercises real network requests without ever touching production. */
function startServer(routes: Record<string, { status: number; contentType: string; body: string }>) {
  const server = createServer((req, res) => {
    const route = routes[req.url ?? '/']
    if (!route) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return }
    res.writeHead(route.status, { 'content-type': route.contentType })
    res.end(route.body)
  })
  return new Promise<{ url: string; close: () => Promise<void> }>(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise(done => server.close(() => done())) })
    })
  })
}

test('parseArgs reads flags and applies documented defaults', () => {
  const options = parseArgs(['--base-url', 'https://getlifeos.co', '--api-url', 'https://lifeos-api.example.run.app', '--timeout-ms', '5000', '--json'])
  assert.equal(options.baseUrl, 'https://getlifeos.co')
  assert.equal(options.apiUrl, 'https://lifeos-api.example.run.app')
  assert.equal(options.timeoutMs, 5000)
  assert.equal(options.json, true)
  assert.equal(options.sessionPath, '/api/auth/session')
  assert.equal(options.protectedPath, '/api/tasks')
  assert.equal(options.healthPath, '/api/health')
  assert.equal(options.sessionCookie, undefined)
})

test('runSmokeSuite passes every check against a healthy deployment, over a real HTTP request', async () => {
  const server = await startServer({
    '/': { status: 200, contentType: 'text/html', body: '<!doctype html><html><body><div id="root"></div></body></html>' },
    '/api/auth/session': { status: 200, contentType: 'application/json', body: '{"authenticated":false}' },
    '/api/tasks': { status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' },
    '/api/health': { status: 200, contentType: 'application/json', body: '{"status":"ok"}' },
  })
  try {
    const suite = await runSmokeSuite({ baseUrl: server.url, apiUrl: undefined, sessionPath: '/api/auth/session', protectedPath: '/api/tasks', healthPath: '/api/health', sessionCookie: undefined, timeoutMs: 4000 })
    assert.equal(suite.status, 'passed')
    assert.equal(suite.results.find(item => item.id === 'frontend-availability')?.status, 'passed')
    assert.equal(suite.results.find(item => item.id === 'auth-session-routing')?.status, 'passed')
    assert.equal(suite.results.find(item => item.id === 'sign-in-gate')?.status, 'passed')
    assert.equal(suite.results.find(item => item.id === 'api-reachability')?.status, 'passed')
    // No --session-cookie was supplied: the script never fabricates credentials, so this is skipped, not faked as a pass.
    assert.equal(suite.results.find(item => item.id === 'protected-read-flow')?.status, 'skipped')
  } finally {
    await server.close()
  }
})

test('runSmokeSuite catches the real /api/auth/session SPA-fallback regression over an actual HTTP round-trip', async () => {
  const server = await startServer({
    '/': { status: 200, contentType: 'text/html', body: '<!doctype html><html><body><div id="root"></div></body></html>' },
    // The regression: the SPA fallback answers the API path with index.html instead of proxying it.
    '/api/auth/session': { status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body><div id="root"></div></body></html>' },
    '/api/tasks': { status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' },
    '/api/health': { status: 200, contentType: 'application/json', body: '{"status":"ok"}' },
  })
  try {
    const suite = await runSmokeSuite({ baseUrl: server.url, apiUrl: undefined, sessionPath: '/api/auth/session', protectedPath: '/api/tasks', healthPath: '/api/health', sessionCookie: undefined, timeoutMs: 4000 })
    assert.equal(suite.status, 'failed')
    const sessionCheck = suite.results.find(item => item.id === 'auth-session-routing')!
    assert.equal(sessionCheck.status, 'failed')
    assert.match(sessionCheck.message, /SPA fallback/)
    assert.equal(sessionCheck.target, `${server.url}/api/auth/session`)
    // Every other, unrelated check is unaffected - the regression is isolated to its own check.
    assert.equal(suite.results.find(item => item.id === 'frontend-availability')?.status, 'passed')
    assert.equal(suite.results.find(item => item.id === 'api-reachability')?.status, 'passed')
  } finally {
    await server.close()
  }
})

test('runSmokeSuite flags an auth-gate bypass (HTTP 200 on an unauthenticated protected request)', async () => {
  const server = await startServer({
    '/': { status: 200, contentType: 'text/html', body: '<!doctype html><html><body><div id="root"></div></body></html>' },
    '/api/auth/session': { status: 200, contentType: 'application/json', body: '{"authenticated":false}' },
    '/api/tasks': { status: 200, contentType: 'application/json', body: '{"tasks":[{"id":"t1"}]}' },
    '/api/health': { status: 200, contentType: 'application/json', body: '{"status":"ok"}' },
  })
  try {
    const suite = await runSmokeSuite({ baseUrl: server.url, apiUrl: undefined, sessionPath: '/api/auth/session', protectedPath: '/api/tasks', healthPath: '/api/health', sessionCookie: undefined, timeoutMs: 4000 })
    assert.equal(suite.status, 'failed')
    const gateCheck = suite.results.find(item => item.id === 'sign-in-gate')!
    assert.equal(gateCheck.status, 'failed')
    assert.match(gateCheck.message, /bypassed/)
  } finally {
    await server.close()
  }
})

test('runSmokeSuite exercises the authenticated protected-read-flow check when a session cookie is explicitly supplied, hitting the real server with it', async () => {
  let receivedCookie: string | undefined
  const server = createServer((req, res) => {
    if (req.url === '/api/tasks') { receivedCookie = req.headers.cookie; res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"tasks":[]}'); return }
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><html><body><div id="root"></div></body></html>'); return }
    if (req.url === '/api/auth/session') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"authenticated":true}'); return }
    if (req.url === '/api/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"status":"ok"}'); return }
    res.writeHead(404); res.end()
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const baseUrl = `http://127.0.0.1:${port}`
  try {
    const suite = await runSmokeSuite({ baseUrl, apiUrl: undefined, sessionPath: '/api/auth/session', protectedPath: '/api/tasks', healthPath: '/api/health', sessionCookie: 'session=abc123', timeoutMs: 4000 })
    assert.equal(suite.results.find(item => item.id === 'protected-read-flow')?.status, 'passed')
    assert.equal(receivedCookie, 'session=abc123')
  } finally {
    await new Promise(done => server.close(() => done(undefined)))
  }
})

test('runSmokeSuite reports a network failure (no server listening) as a failed, non-throwing check', async () => {
  const suite = await runSmokeSuite({ baseUrl: 'http://127.0.0.1:1', apiUrl: undefined, sessionPath: '/api/auth/session', protectedPath: '/api/tasks', healthPath: '/api/health', sessionCookie: undefined, timeoutMs: 1000 })
  assert.equal(suite.status, 'failed')
  assert.ok(suite.results.every(item => item.id === 'protected-read-flow' || item.status === 'failed'))
})
