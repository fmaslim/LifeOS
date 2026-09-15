import assert from 'node:assert/strict'
import test from 'node:test'
import type { ActivityEvent } from '../src/models/activity.ts'
import type { NotificationEvent } from '../src/models/notification.ts'
import type { ReleaseRecord } from '../src/models/release.ts'
import { ApprovalService } from '../src/services/ApprovalService.ts'
import { InMemoryAutomationRunRepository } from '../src/services/AutomationHistoryService.ts'
import { ReleaseService } from '../src/services/ReleaseService.ts'
import { createDefaultSmokeCheckProbes, SmokeCheckService } from '../src/services/SmokeCheckService.ts'
import {
  evaluateApiReachability,
  evaluateAuthSessionRouting,
  evaluateFrontendAvailability,
  evaluateProtectedReadFlow,
  evaluateSignInGate,
  type ProbeResponse,
} from '../src/services/SmokeCheckLogic.ts'

class ApprovalStorage { private value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }
class RecordingActivity { events: ActivityEvent[] = []; publish(event: ActivityEvent) { if (this.events.some(item => item.id === event.id)) return; this.events.push(event) }; getActivityData() { return { events: this.events } } }
class RecordingNotifications { events: NotificationEvent[] = []; publish(event: NotificationEvent) { if (this.events.some(item => item.deduplicationKey === event.deduplicationKey)) return this.events.find(item => item.deduplicationKey === event.deduplicationKey)!; this.events.push(event); return { ...event, id: `n-${event.deduplicationKey}`, read: false } }; getNotificationData() { return { notifications: [] } } }

// --- Pure logic (SmokeCheckLogic.ts) ---

test('evaluateAuthSessionRouting fails on the historical SPA-fallback regression: HTML instead of the session JSON', () => {
  const spaFallback: ProbeResponse = { status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body><div id="root"></div></body></html>' }
  const result = evaluateAuthSessionRouting(spaFallback)
  assert.equal(result.status, 'failed')
  assert.match(result.message, /SPA fallback/)
})

test('evaluateAuthSessionRouting fails when content-type claims JSON but the body is HTML (a misconfigured proxy header)', () => {
  const mislabeled: ProbeResponse = { status: 200, contentType: 'application/json', body: '<!doctype html><html></html>' }
  const result = evaluateAuthSessionRouting(mislabeled)
  assert.equal(result.status, 'failed')
  assert.match(result.message, /SPA fallback/)
})

test('evaluateAuthSessionRouting passes for a real JSON session response, authenticated or not', () => {
  assert.equal(evaluateAuthSessionRouting({ status: 200, contentType: 'application/json', body: '{"authenticated":true}' }).status, 'passed')
  assert.equal(evaluateAuthSessionRouting({ status: 401, contentType: 'application/json', body: '{"authenticated":false}' }).status, 'passed')
})

test('evaluateAuthSessionRouting fails on malformed JSON, an unexpected status, or no response', () => {
  assert.equal(evaluateAuthSessionRouting({ status: 200, contentType: 'application/json', body: '{not json' }).status, 'failed')
  assert.equal(evaluateAuthSessionRouting({ status: 500, contentType: 'application/json', body: '{}' }).status, 'failed')
  assert.equal(evaluateAuthSessionRouting({ status: 0, contentType: '', body: '' }).status, 'failed')
})

test('evaluateFrontendAvailability requires 200, text/html, and app-shell markup', () => {
  assert.equal(evaluateFrontendAvailability({ status: 200, contentType: 'text/html', body: '<html><div id="root"></div></html>' }).status, 'passed')
  assert.equal(evaluateFrontendAvailability({ status: 503, contentType: 'text/html', body: '<html></html>' }).status, 'failed')
  assert.equal(evaluateFrontendAvailability({ status: 200, contentType: 'application/json', body: '{}' }).status, 'failed')
  assert.equal(evaluateFrontendAvailability({ status: 200, contentType: 'text/html', body: 'not the app shell' }).status, 'failed')
})

test('evaluateSignInGate passes only for 401/403/redirect and fails a 200 (an auth-gate bypass)', () => {
  assert.equal(evaluateSignInGate({ status: 401, contentType: 'application/json', body: '{}' }).status, 'passed')
  assert.equal(evaluateSignInGate({ status: 403, contentType: 'application/json', body: '{}' }).status, 'passed')
  assert.equal(evaluateSignInGate({ status: 302, contentType: 'text/html', body: '' }).status, 'passed')
  const bypass = evaluateSignInGate({ status: 200, contentType: 'application/json', body: '{"secret":"data"}' })
  assert.equal(bypass.status, 'failed')
  assert.match(bypass.message, /bypassed/)
  assert.equal(evaluateSignInGate({ status: 500, contentType: 'application/json', body: '{}' }).status, 'failed')
})

test('evaluateApiReachability fails on 5xx, HTML, or non-JSON responses and passes on healthy JSON', () => {
  assert.equal(evaluateApiReachability({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' }).status, 'passed')
  assert.equal(evaluateApiReachability({ status: 502, contentType: 'text/plain', body: 'bad gateway' }).status, 'failed')
  assert.equal(evaluateApiReachability({ status: 200, contentType: 'text/html', body: '<html></html>' }).status, 'failed')
  assert.equal(evaluateApiReachability({ status: 0, contentType: '', body: '' }).status, 'failed')
})

test('evaluateProtectedReadFlow requires 200 JSON with the expected shape and never depends on a write', () => {
  assert.equal(evaluateProtectedReadFlow({ status: 200, contentType: 'application/json', body: '{"tasks":[]}' }, true).status, 'passed')
  assert.equal(evaluateProtectedReadFlow({ status: 200, contentType: 'application/json', body: '{"tasks":[]}' }, false).status, 'failed')
  assert.equal(evaluateProtectedReadFlow({ status: 401, contentType: 'application/json', body: '{}' }, true).status, 'failed')
  assert.equal(evaluateProtectedReadFlow({ status: 200, contentType: 'text/html', body: '<html></html>' }, true).status, 'failed')
})

// --- SmokeCheckService integration ---

function releaseFixture(): ReleaseRecord[] {
  return [
    { id: 'frontend-current', component: 'frontend', environment: 'production', commitSha: 'front-abc', branch: 'main', buildId: 'b-front', imageId: 'web@sha256:1', revisionId: 'lifeos-web-9', deployedAt: '2026-09-15T00:00:00Z', state: 'current' },
    { id: 'backend-current', component: 'backend', environment: 'production', commitSha: 'back-def', branch: 'main', buildId: 'b-back', imageId: 'api@sha256:1', revisionId: 'lifeos-api-9', deployedAt: '2026-09-15T00:00:00Z', state: 'current' },
  ]
}

function fixture(probes = createDefaultSmokeCheckProbes()) {
  const releases = new ReleaseService(releaseFixture(), new ApprovalService(undefined, new ApprovalStorage()))
  const activity = new RecordingActivity()
  const notifications = new RecordingNotifications()
  const history = new InMemoryAutomationRunRepository()
  const service = new SmokeCheckService(probes, releases, activity, notifications, history)
  return { service, activity, notifications, history }
}

test('a healthy default suite passes every check and records deployed revision/build metadata for both components', async () => {
  const { service, activity, history } = fixture()
  const run = await service.run('frontend', 'production', new Date('2026-09-15T12:00:00Z'))
  assert.equal(run.status, 'passed')
  assert.equal(run.results.length, 5)
  assert.ok(run.results.every(item => item.status === 'passed'))
  assert.equal(run.frontendRelease?.revisionId, 'lifeos-web-9')
  assert.equal(run.backendRelease?.revisionId, 'lifeos-api-9')
  assert.equal(activity.events.length, 0) // no failures: nothing published
  assert.equal(history.list()[0]?.status, 'completed')
  assert.equal(service.last(), run)
})

test('the suite would catch the /api/auth/session SPA-fallback regression: it fails the run, names the route, and carries the deployed revision', async () => {
  const regressed = createDefaultSmokeCheckProbes().map(probe => probe.id === 'auth-session-routing'
    ? { ...probe, run: async () => evaluateAuthSessionRouting({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body><div id="root"></div></body></html>' }) }
    : probe)
  const { service, activity, notifications, history } = fixture(regressed)
  const run = await service.run('frontend', 'production', new Date('2026-09-15T12:05:00Z'))

  assert.equal(run.status, 'failed')
  const failedCheck = run.results.find(item => item.id === 'auth-session-routing')!
  assert.equal(failedCheck.status, 'failed')
  assert.match(failedCheck.message, /SPA fallback/)
  assert.equal(failedCheck.route, 'settings') // identifies the affected workspace/route

  // Every other check remains isolated and still passes.
  assert.ok(run.results.filter(item => item.id !== 'auth-session-routing').every(item => item.status === 'passed'))

  // Deployment revision/build metadata travels with the failed run.
  assert.equal(run.frontendRelease?.revisionId, 'lifeos-web-9')
  assert.equal(run.frontendRelease?.commitSha, 'front-abc')

  // Published to Activity/Notifications and recorded in automation history - not a parallel log.
  assert.equal(activity.events[0]?.route, 'smoke-checks')
  assert.match(activity.events[0]?.description ?? '', /SPA fallback/)
  assert.equal(notifications.events[0]?.severity, 'critical')
  assert.equal(history.list()[0]?.status, 'failed')
  assert.match(history.list()[0]?.errorDetails ?? '', /SPA fallback/)
})

test('a probe that throws is isolated to its own check and still fails the run with a safe, redacted message', async () => {
  const throwing = createDefaultSmokeCheckProbes().map(probe => probe.id === 'api-reachability'
    ? { ...probe, run: async () => { throw new Error('connection refused token=super-secret') } }
    : probe)
  const { service } = fixture(throwing)
  const run = await service.run('backend', 'production', new Date('2026-09-15T12:10:00Z'))
  assert.equal(run.status, 'failed')
  const failed = run.results.find(item => item.id === 'api-reachability')!
  assert.equal(failed.status, 'failed')
  assert.doesNotMatch(failed.message, /super-secret/)
  assert.ok(run.results.filter(item => item.id !== 'api-reachability').every(item => item.status === 'passed'))
})

test('run() never mutates release records or approval state - it is strictly read-only', async () => {
  const releases = new ReleaseService(releaseFixture(), new ApprovalService(undefined, new ApprovalStorage()))
  const activity = new RecordingActivity()
  const service = new SmokeCheckService(createDefaultSmokeCheckProbes(), releases, activity)
  const before = releases.list()
  await service.run('frontend')
  assert.deepEqual(releases.list(), before)
})
