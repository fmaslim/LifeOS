import type { AssistantToolResult } from '../models/assistant.ts'
import type { AutomationRun } from '../models/automation.ts'
import type { DailyBriefData } from '../models/dailyBrief.ts'
import type { JarvisData } from '../models/jarvis.ts'
import type { ContentService } from './ContentService.ts'
import type { ApprovalService } from './ApprovalService.ts'

interface AssistantDependencies { dailyBrief: { getDailyBrief(): DailyBriefData }; automationHistory: { list(): AutomationRun[] }; jarvis: { getJarvisData(): JarvisData }; content: ContentService; approvals: ApprovalService }
export interface AssistantService { ask(input: string, approved?: boolean): Promise<AssistantToolResult> }

/** Local intent router over typed LifeOS tools. A language-model adapter can replace routing without changing tool approval rules. */
export class LifeOSAssistantService implements AssistantService {
  private readonly services: AssistantDependencies
  constructor(services: AssistantDependencies) { this.services = services }
  async ask(input: string, approved = false): Promise<AssistantToolResult> {
    const normalized = input.toLowerCase()
    try {
      if (/generate.*content|content.*today/.test(normalized)) {
        if (!approved) {
          const correlationId = `assistant-content-${input.trim().toLowerCase().replace(/\W+/g, '-').slice(0, 48)}`
          this.services.approvals.request({ source: 'AI Assistant', action: 'content.generate', summary: 'Generate a content package through the configured provider', risk: 'medium', correlationId, payloadPreview: { prompt: input } }, async () => { if (this.services.content.getProviderStatus() === 'configured') await this.services.content.generateShortContent({ topic: "today's highest-priority LifeOS theme" }) })
          return { kind: 'approval-required', tool: 'content.generate', risk: 'external-write', text: 'This content action is waiting in the Approval Inbox.' }
        }
        if (this.services.content.getProviderStatus() !== 'configured') return { kind: 'error', tool: 'content.generate', risk: 'external-write', text: 'The content provider is not configured.' }
        const result = await this.services.content.generateShortContent({ topic: "today's highest-priority LifeOS theme" }); return { kind: 'answer', tool: 'content.generate', risk: 'external-write', text: `Created “${result.title}” with ${result.tags?.length ?? 0} tags and a complete artifact package.`, links: [{ label: 'Open content', route: 'content' }, { label: 'Open pipeline', route: 'content-pipeline' }] }
      }
      if (/failed|overnight|failure/.test(normalized)) { const failures = this.services.automationHistory.list().filter(run => run.status === 'failed'); return { kind: 'answer', tool: 'automation.history.read', risk: 'read', text: failures.length ? `${failures.length} failed run${failures.length === 1 ? '' : 's'} need attention: ${failures.map(run => run.automationName).join(', ')}.` : 'No failed automation runs need attention.', links: [{ label: 'View run history', route: 'automation-history' }] } }
      if (/jarvis|prospect|outreach/.test(normalized)) { const data = this.services.jarvis.getJarvisData(); return { kind: data.connection === 'unavailable' ? 'error' : 'answer', tool: 'jarvis.read', risk: 'read', text: data.connection === 'unavailable' ? 'Jarvis provider data is unavailable right now.' : `${data.providerName} is ${data.connection}. ${data.metrics.map(metric => `${metric.label}: ${metric.value}`).join(' · ')}`, links: [{ label: 'Open Jarvis', route: 'jarvis' }] } }
      const brief = this.services.dailyBrief.getDailyBrief(); return { kind: 'answer', tool: 'daily-brief.read', risk: 'read', text: brief.actions.length ? `Start with ${brief.actions[0]?.title}. ${brief.actions[0]?.reason}. You have ${brief.actions.length} ranked actions in today’s brief.` : 'Your daily brief has no urgent actions.', links: [{ label: 'Open Daily Brief', route: 'daily-brief' }] }
    } catch (error) { return { kind: 'error', tool: 'lifeos.tool', risk: 'read', text: error instanceof Error ? `The tool could not finish: ${error.message}` : 'The tool could not finish.' } }
  }
}
