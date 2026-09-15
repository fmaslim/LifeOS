import type { ActivityService } from './ActivityService'
import type { AutomationRunRepository } from './AutomationHistoryService'
import type { NotificationService } from './NotificationService'
import type { ReleaseService } from './ReleaseService'
import type { ReleaseComponent } from '../models/release'
import type { SmokeCheckProbe, SmokeCheckResult, SmokeCheckStatus, SmokeSuiteRun } from '../models/smokeCheck'
import { evaluateApiReachability, evaluateAuthSessionRouting, evaluateFrontendAvailability, evaluateProtectedReadFlow, evaluateSignInGate } from './SmokeCheckLogic.ts'

const safeMessage = (value: unknown) => value instanceof Error ? value.message.replace(/(token|secret|password|key)=\S+/gi, '$1=[redacted]') : 'Smoke check failed safely.'

/**
 * Runs the bounded production smoke suite (frontend availability, `/api/auth/session` routing,
 * the sign-in gate, critical API reachability, and a representative protected read-only flow)
 * after a frontend or backend deployment, and ties every result to the deployed revision/build
 * metadata already tracked by `ReleaseService` rather than inventing a parallel provenance
 * concept. Every probe is read-only: nothing here ever mutates production or simulated data.
 *
 * One probe throwing never fails the whole run - Promise.allSettled isolates each check the same
 * way `ProductionHealthService` does - and any failure publishes to `ActivityService`/
 * `NotificationService` and is recorded through `AutomationRunRepository`, the same convention
 * `ProductionHealthService`/`ReleaseService.requestRollback` use, instead of a parallel log.
 */
export class SmokeCheckService {
  private readonly probes: SmokeCheckProbe[]
  private readonly releases: ReleaseService
  private readonly activity?: ActivityService
  private readonly notifications?: NotificationService
  private readonly history?: AutomationRunRepository
  private lastRun?: SmokeSuiteRun

  constructor(probes: SmokeCheckProbe[], releases: ReleaseService, activity?: ActivityService, notifications?: NotificationService, history?: AutomationRunRepository) {
    this.probes = probes
    this.releases = releases
    this.activity = activity
    this.notifications = notifications
    this.history = history
  }

  /** The most recently completed run, if any. Read-only; triggers nothing. */
  last() { return this.lastRun }

  async run(triggeredBy: ReleaseComponent, environment = 'production', now = new Date()): Promise<SmokeSuiteRun> {
    const triggeredAt = now.toISOString()
    const frontendRelease = this.releases.current('frontend', environment)
    const backendRelease = this.releases.current('backend', environment)
    const settled = await Promise.allSettled(this.probes.map(probe => probe.run()))
    const results: SmokeCheckResult[] = settled.map((outcome, index) => {
      const probe = this.probes[index]!
      const result = outcome.status === 'fulfilled' ? outcome.value : { status: 'failed' as const, message: safeMessage(outcome.reason) }
      return { id: probe.id, kind: probe.kind, label: probe.label, route: probe.route, checkedAt: triggeredAt, ...result }
    })
    const status: SmokeCheckStatus = results.some(item => item.status === 'failed') ? 'failed' : 'passed'
    const id = `smoke-${triggeredBy}-${triggeredAt}`
    const run: SmokeSuiteRun = { id, triggeredBy, environment, triggeredAt, status, results, frontendRelease, backendRelease }
    this.lastRun = run

    const failures = results.filter(item => item.status === 'failed')
    const revisionSummary = [frontendRelease && `frontend ${frontendRelease.revisionId}`, backendRelease && `backend ${backendRelease.revisionId}`].filter(Boolean).join(' · ')
    this.history?.save({
      id,
      automationId: 'production-smoke-checks',
      automationName: 'Production Smoke Checks',
      trigger: 'Deployment',
      triggerSource: `${triggeredBy} deploy`,
      correlationId: (triggeredBy === 'frontend' ? frontendRelease : backendRelease)?.id,
      startedAt: triggeredAt,
      endedAt: triggeredAt,
      durationMs: 0,
      status: failures.length ? 'failed' : 'completed',
      outputSummary: failures.length ? `${failures.length} of ${results.length} smoke check(s) failed after ${triggeredBy} deployment (${revisionSummary || 'no current release on record'}).` : `All ${results.length} smoke checks passed after ${triggeredBy} deployment (${revisionSummary || 'no current release on record'}).`,
      errorDetails: failures.map(item => `${item.label}: ${item.message}`).join(' · ') || undefined,
      retryCount: 0,
      relatedLinks: [{ label: 'Open smoke checks', href: '#/smoke-checks' }],
    })
    if (failures.length) {
      const description = failures.map(item => `${item.label}: ${item.message}`).join(' · ')
      this.activity?.publish({ id, timestamp: triggeredAt, source: 'System', type: 'Production smoke check failed', description, status: 'attention', route: 'smoke-checks', runId: id, important: true })
      this.notifications?.publish({ title: `Production smoke checks failed after ${triggeredBy} deployment`, message: description, source: 'System', severity: 'critical', timestamp: triggeredAt, route: 'smoke-checks', deduplicationKey: `smoke-checks:${triggeredBy}:${description}` })
    }
    return run
  }
}

/**
 * The bounded, deterministic default suite (mirrors `createDefaultProductionHealthProbes`):
 * simulated but faithful probe results representing a healthy production deployment, so the
 * in-app workspace is inspectable and re-runnable without any real network access. Each probe
 * delegates to the same pure evaluator a real HTTP-backed probe (see `scripts/smoke-check.mjs`)
 * would use, so the pass/fail logic itself is identical between the simulated and real paths.
 */
export function createDefaultSmokeCheckProbes(): SmokeCheckProbe[] {
  return [
    { id: 'frontend-availability', kind: 'frontend-availability', label: 'Frontend availability', route: 'dashboard', run: async () => evaluateFrontendAvailability({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><body><div id="root"></div></body></html>' }) },
    { id: 'auth-session-routing', kind: 'auth-session-routing', label: 'Auth session routing (/api/auth/session)', route: 'settings', run: async () => evaluateAuthSessionRouting({ status: 200, contentType: 'application/json; charset=utf-8', body: '{"authenticated":false}' }) },
    { id: 'sign-in-gate', kind: 'sign-in-gate', label: 'Sign-in gate (unauthenticated protected request)', route: 'settings', run: async () => evaluateSignInGate({ status: 401, contentType: 'application/json; charset=utf-8', body: '{"error":"unauthorized"}' }) },
    { id: 'api-reachability', kind: 'api-reachability', label: 'Critical API reachability', route: 'settings', run: async () => evaluateApiReachability({ status: 200, contentType: 'application/json; charset=utf-8', body: '{"status":"ok"}' }) },
    { id: 'protected-read-flow', kind: 'protected-read-flow', label: 'Representative protected read-only flow (tasks list)', route: 'tasks', run: async () => evaluateProtectedReadFlow({ status: 200, contentType: 'application/json; charset=utf-8', body: '{"tasks":[]}' }, true) },
  ]
}
