import { sanitizeDiagnostic } from '../errors/errorDiagnostics.ts'
import type { AutomationRun, AutomationRunFilter } from '../models/automation.ts'

export interface AutomationRunRepository { list(filter?: AutomationRunFilter): AutomationRun[]; get(id: string): AutomationRun | undefined; save(run: AutomationRun): void }

export class InMemoryAutomationRunRepository implements AutomationRunRepository {
  private readonly runs: AutomationRun[]
  constructor(seed: AutomationRun[] = []) { this.runs = seed.map(run => this.safe(run)) }
  private safe(run: AutomationRun) { return { ...run, errorDetails: run.errorDetails ? sanitizeDiagnostic(run.errorDetails) : undefined, relatedLinks: [...run.relatedLinks] } }
  save(run: AutomationRun) { const safe = this.safe(run); const index = this.runs.findIndex(item => item.id === safe.id); if (index < 0) this.runs.push(safe); else this.runs[index] = safe }
  get(id: string) { const run = this.runs.find(item => item.id === id); return run ? this.safe(run) : undefined }
  list(filter: AutomationRunFilter = {}) { return this.runs.filter(run => (!filter.automationId || run.automationId === filter.automationId) && (!filter.status || run.status === filter.status) && (!filter.from || run.startedAt >= filter.from) && (!filter.to || run.startedAt <= filter.to)).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).map(run => this.safe(run)) }
}

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()
const run = (id: string, automationId: string, automationName: string, status: AutomationRun['status'], hours: number, retryCount = 0, errorDetails?: string): AutomationRun => ({ id, automationId, automationName, trigger: hours > 10 ? 'Schedule' : 'Manual', startedAt: ago(hours), endedAt: ago(hours - .02), durationMs: 72_000, status, outputSummary: status === 'completed' || status === 'retried' ? 'Workflow finished and published its local output.' : 'Workflow stopped before producing output.', errorDetails, retryCount, retryReason: retryCount ? 'Transient provider timeout' : undefined, relatedLinks: [{ label: 'Open automation', href: '#/automations' }] })
const historySeed = [run('run-brief-42','morning-brief','Morning Command Brief','completed',2),run('run-property-18','property-sync','Property Ledger Sync','failed',5,2,'Provider request failed token=private-value https://provider.example/private'),run('run-followup-17','lead-follow-up','Lead Follow-up','retried',9,1,'Recovered after transient provider timeout.'),run('run-content-11','content-planning','Content Planning Session','canceled',28)]
export class MockAutomationHistoryService extends InMemoryAutomationRunRepository { constructor() { super(historySeed) } }
