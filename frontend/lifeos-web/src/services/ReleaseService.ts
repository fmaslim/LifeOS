import type { ActivityService } from './ActivityService'
import type { ApprovalService } from './ApprovalService'
import type { AutomationRunRepository } from './AutomationHistoryService'
import type { ReleaseComponent, ReleaseRecord, RollbackGuidance } from '../models/release'

export class ReleaseService {
  private readonly records: ReleaseRecord[]; private readonly approvals: ApprovalService; private readonly activity?: ActivityService; private readonly history?: AutomationRunRepository
  constructor(records: ReleaseRecord[], approvals: ApprovalService, activity?: ActivityService, history?: AutomationRunRepository) { this.records = records; this.approvals = approvals; this.activity = activity; this.history = history }
  list() { return [...this.records].sort((a, b) => b.deployedAt.localeCompare(a.deployedAt)) }
  current(component: ReleaseComponent, environment = 'production') { return this.list().find(item => item.component === component && item.environment === environment && item.state === 'current') }
  guidance(releaseId: string): RollbackGuidance | undefined { const release = this.records.find(item => item.id === releaseId); return release ? { releaseId, summary: `Restore ${release.component} revision ${release.revisionId} after verifying compatibility.`, steps: ['Review release metadata and incident impact.', 'Confirm database and configuration compatibility.', 'Approve rollback in LifeOS.', 'Execute through the deployment provider and verify smoke checks.'], approvalRequired: true } : undefined }
  requestRollback(releaseId: string) {
    const release = this.records.find(item => item.id === releaseId); if (!release) return undefined
    return this.approvals.request({ source: 'Release Management', action: 'deployment.rollback', summary: `Request ${release.environment} ${release.component} rollback to ${release.revisionId}`, risk: 'high', correlationId: `rollback:${release.id}`, payloadPreview: { releaseId: release.id, component: release.component, environment: release.environment, commitSha: release.commitSha, revisionId: release.revisionId } }, () => {
      const timestamp = new Date().toISOString(); const id = `rollback-approved-${release.id}`
      this.activity?.publish({ id, timestamp, source: 'System', type: 'Rollback approved', description: `Rollback to ${release.revisionId} is approved and awaits the deployment provider.`, status: 'attention', route: 'releases', important: true })
      this.history?.save({ id, automationId: 'release-rollback', automationName: 'Release Rollback', trigger: 'Approval', triggerSource: 'User', correlationId: `rollback:${release.id}`, startedAt: timestamp, endedAt: timestamp, durationMs: 0, status: 'completed', outputSummary: 'Rollback approval recorded; provider execution remains explicit.', retryCount: 0, relatedLinks: [{ label: 'Open releases', href: '#/releases' }] })
    })
  }
}

export const releaseSeed: ReleaseRecord[] = [
  { id: 'frontend-current', component: 'frontend', environment: 'production', commitSha: '44204eb0163770344c59eeda65c2bca86e041c56', branch: 'main', buildId: 'cloud-build-frontend-current', imageId: 'lifeos-web@sha256:recorded-by-deploy', revisionId: 'lifeos-web-current', deployedAt: '2026-09-14T18:10:00Z', state: 'current', sourceUrl: 'https://github.com/fmaslim/LifeOS/commit/44204eb0163770344c59eeda65c2bca86e041c56' },
  { id: 'backend-current', component: 'backend', environment: 'production', commitSha: '44204eb0163770344c59eeda65c2bca86e041c56', branch: 'main', buildId: 'cloud-build-api-current', imageId: 'lifeos-api@sha256:recorded-by-deploy', revisionId: 'lifeos-api-00016-q25', deployedAt: '2026-09-14T18:08:00Z', state: 'current', sourceUrl: 'https://github.com/fmaslim/LifeOS/commit/44204eb0163770344c59eeda65c2bca86e041c56' },
  { id: 'backend-auth-first', component: 'backend', environment: 'production', commitSha: '55428173d9fde45690079ce765c041fa05b69f66', branch: 'main', buildId: 'cloud-build-api-auth', imageId: 'lifeos-api@sha256:historical', revisionId: 'lifeos-api-00007-88g', deployedAt: '2026-09-14T12:00:00Z', state: 'superseded', sourceUrl: 'https://github.com/fmaslim/LifeOS/commit/55428173d9fde45690079ce765c041fa05b69f66' },
]
