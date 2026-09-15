import type { ActivityService } from './ActivityService'
import type { NotificationService } from './NotificationService'
import type { ConfigurationDriftFinding, ConfigurationDriftReport, ConfigurationRequirement, RuntimeConfigurationMetadata } from '../models/configurationDrift'

export class ConfigurationDriftService {
  private readonly manifest: ConfigurationRequirement[]; private readonly runtime: RuntimeConfigurationMetadata[]; private readonly activity?: ActivityService; private readonly notifications?: NotificationService
  constructor(manifest: ConfigurationRequirement[], runtime: RuntimeConfigurationMetadata[], activity?: ActivityService, notifications?: NotificationService) { this.manifest = manifest; this.runtime = runtime; this.activity = activity; this.notifications = notifications }
  evaluate(now = new Date()): ConfigurationDriftReport {
    const findings: ConfigurationDriftFinding[] = []
    for (const requirement of this.manifest) {
      const actual = this.runtime.find(item => item.name === requirement.name && item.scope === requirement.scope)
      if (requirement.required && !actual?.present) findings.push({ name: requirement.name, scope: requirement.scope, kind: 'missing', status: 'attention', remediation: requirement.remediation })
      else if (actual?.present && !requirement.secret && requirement.expected !== undefined && actual.safeValue !== requirement.expected) findings.push({ name: requirement.name, scope: requirement.scope, kind: requirement.kind ?? 'mismatch', status: 'attention', remediation: requirement.remediation })
    }
    const checkedAt = now.toISOString(); const report = { checkedAt, healthy: findings.length === 0, findings, checkedNames: this.manifest.map(item => item.name) }
    if (findings.length) { const summary = findings.map(item => `${item.scope}:${item.name} (${item.kind})`).join(' · '); const id = `configuration-drift-${checkedAt}`; this.activity?.publish({ id, timestamp: checkedAt, source: 'System', type: 'Configuration drift detected', description: summary, status: 'attention', route: 'production-health', important: true }); this.notifications?.publish({ title: 'Configuration drift detected', message: summary, source: 'System', severity: 'important', timestamp: checkedAt, route: 'production-health', deduplicationKey: `configuration-drift:${summary}` }) }
    return report
  }
}

export const defaultConfigurationManifest: ConfigurationRequirement[] = [
  { name: 'API_BASE_URL', scope: 'frontend', required: true, secret: false, expected: '/api', kind: 'stale-api-target', remediation: 'Point the frontend API base at the same-origin /api proxy.' },
  { name: 'AUTH_SESSION_ROUTE', scope: 'frontend', required: true, secret: false, expected: '/api/auth/session', kind: 'route-mismatch', remediation: 'Restore the protected JSON session route.' },
  { name: 'PERSISTENCE_ROOT', scope: 'backend', required: true, secret: false, expected: 'configured', remediation: 'Configure the durable persistence root.' },
  { name: 'AUTH_SIGNING_KEY', scope: 'backend', required: true, secret: true, remediation: 'Configure the secret through the deployment secret provider.' },
]

export const defaultRuntimeConfiguration: RuntimeConfigurationMetadata[] = [
  { name: 'API_BASE_URL', scope: 'frontend', present: true, safeValue: '/api' },
  { name: 'AUTH_SESSION_ROUTE', scope: 'frontend', present: true, safeValue: '/api/auth/session' },
  { name: 'PERSISTENCE_ROOT', scope: 'backend', present: true, safeValue: 'configured' },
  { name: 'AUTH_SIGNING_KEY', scope: 'backend', present: true },
]
