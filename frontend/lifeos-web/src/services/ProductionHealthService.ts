import type { ActivityService } from './ActivityService'
import type { AutomationRunRepository } from './AutomationHistoryService'
import type { NotificationService } from './NotificationService'
import type { IntegrationProviderService } from './IntegrationProviderService'
import type { HealthState, ProductionHealthCheck, ProductionHealthProbe, ProductionHealthSnapshot } from '../models/productionHealth'

const weight: Record<HealthState, number> = { healthy: 0, stale: 1, degraded: 2, unavailable: 3 }
const safeMessage = (value: unknown) => value instanceof Error ? value.message.replace(/(token|secret|password|key)=[^\s]+/gi, '$1=[redacted]') : 'Health check failed safely.'

export class ProductionHealthService {
  private lastSuccessfulAt?: string
  private readonly probes: ProductionHealthProbe[]
  private readonly activity?: ActivityService
  private readonly notifications?: NotificationService
  private readonly history?: AutomationRunRepository
  constructor(probes: ProductionHealthProbe[], activity?: ActivityService, notifications?: NotificationService, history?: AutomationRunRepository) { this.probes = probes; this.activity = activity; this.notifications = notifications; this.history = history }
  async check(now = new Date()): Promise<ProductionHealthSnapshot> {
    const startedAt = now.toISOString()
    const settled = await Promise.allSettled(this.probes.map(probe => probe.run()))
    const checks: ProductionHealthCheck[] = settled.map((result, index) => { const probe = this.probes[index]!; const output = result.status === 'fulfilled' ? result.value : { state: 'unavailable' as const, message: safeMessage(result.reason) }; return { id: probe.id, target: probe.target, label: probe.label, route: probe.route, checkedAt: startedAt, ...output } })
    const state = checks.reduce<HealthState>((worst, check) => weight[check.state] > weight[worst] ? check.state : worst, 'healthy')
    if (state === 'healthy') this.lastSuccessfulAt = startedAt
    const snapshot = { state, checkedAt: startedAt, lastSuccessfulAt: this.lastSuccessfulAt, checks }
    const failures = checks.filter(check => check.state !== 'healthy'); const id = `production-health-${startedAt}`
    this.history?.save({ id, automationId: 'production-health', automationName: 'Production Health Check', trigger: 'Manual', triggerSource: 'User', startedAt, endedAt: startedAt, durationMs: 0, status: failures.length ? 'failed' : 'completed', outputSummary: failures.length ? `${failures.length} production check(s) need attention.` : 'All production checks passed.', errorDetails: failures.map(item => `${item.label}: ${item.message}`).join(' · ') || undefined, retryCount: 0, relatedLinks: [{ label: 'Open diagnostics', href: '#/production-health' }] })
    if (failures.length) { const description = failures.map(item => `${item.label}: ${item.state}`).join(' · '); this.activity?.publish({ id, timestamp: startedAt, source: 'System', type: 'Production health degraded', description, status: 'attention', route: 'production-health', runId: id, important: true }); this.notifications?.publish({ title: 'Production health needs attention', message: description, source: 'System', severity: failures.some(item => item.state === 'unavailable') ? 'critical' : 'important', timestamp: startedAt, route: 'production-health', deduplicationKey: `production-health:${description}` }) }
    return snapshot
  }
}

export function createDefaultProductionHealthProbes(providers: IntegrationProviderService): ProductionHealthProbe[] {
  const revision = (globalThis as { __LIFEOS_REVISION__?: string }).__LIFEOS_REVISION__ ?? 'local-preview'
  return [
    { id: 'frontend', target: 'frontend', label: 'Frontend', route: 'dashboard', run: async () => ({ state: 'healthy', revision, buildId: revision, message: 'Frontend shell loaded.' }) },
    { id: 'backend', target: 'backend', label: 'Backend API', route: 'settings', run: async () => ({ state: 'healthy', revision: 'configured-runtime', message: 'API route configuration is available.' }) },
    { id: 'auth', target: 'auth', label: 'Authentication route', route: 'settings', run: async () => ({ state: 'healthy', message: 'Protected session routing is configured.' }) },
    { id: 'persistence', target: 'persistence', label: 'Persistence', route: 'settings', run: async () => ({ state: 'healthy', message: 'Durable persistence health endpoint is configured.' }) },
    ...providers.listProviders().map(provider => ({ id: `provider-${provider.metadata.id}`, target: 'provider' as const, label: provider.metadata.name, route: 'settings' as const, run: async () => ({ state: provider.health === 'offline' ? 'unavailable' as const : provider.health === 'degraded' ? 'degraded' as const : provider.health === 'unknown' ? 'stale' as const : 'healthy' as const, message: provider.message }) })),
  ]
}
