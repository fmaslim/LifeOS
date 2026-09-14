import type { AgentControlData, AgentControlRequest, AgentControlResult } from '../models/agentControl.ts'
import type { ApprovalService } from './ApprovalService.ts'
export interface AgentMonitorProvider { readStatus(): AgentControlData }
export interface AgentActionProvider { execute(request: AgentControlRequest): AgentControlResult }
export interface AgentControlService { getStatus(): AgentControlData; control(request: AgentControlRequest): AgentControlResult }
export class ProviderBackedAgentControlService implements AgentControlService {
  private readonly monitor: AgentMonitorProvider
  private readonly actions: AgentActionProvider
  private readonly approvals?: ApprovalService
  constructor(monitor: AgentMonitorProvider, actions: AgentActionProvider, approvals?: ApprovalService) { this.monitor = monitor; this.actions = actions; this.approvals = approvals }
  getStatus() { try { return this.monitor.readStatus() } catch { return { provider: 'Agent provider', connection: 'unavailable' as const, agentStatus: 'idle' as const, lastActivity: 'Unavailable', tasks: [], message: 'Agent provider is unavailable. LifeOS remains operational.' } } }
  control(request: AgentControlRequest) {
    try {
      if (!this.approvals) return this.actions.execute(request)
      const approval = this.approvals.request({ source: 'Agent Control', action: `agent.${request.action}`, summary: `${request.action} agent task ${request.taskId}`, risk: request.action === 'stop' ? 'high' : 'medium', correlationId: request.idempotencyKey, payloadPreview: { taskId: request.taskId, action: request.action } }, () => { this.actions.execute(request) })
      return { accepted: false, message: `Waiting for approval (${approval.id}).` }
    } catch { return { accepted: false, message: 'The control action could not reach the provider.' } }
  }
}

export class MockAgentProvider implements AgentMonitorProvider, AgentActionProvider {
  private data: AgentControlData = { provider: 'Codex Agent', connection: 'connected', agentStatus: 'running', lastActivity: new Date().toISOString(), tasks: [{ id: 'agent-75', title: 'Build Agent Control Center', detail: 'Implementing provider controls and safety states.', state: 'current', updatedAt: new Date().toISOString() },{ id: 'agent-76', title: 'Build AI Assistant', detail: 'Queued after the current issue.', state: 'queued', updatedAt: new Date().toISOString() },{ id: 'agent-74', title: 'GitHub project dashboard', detail: 'Merged safely.', state: 'completed', updatedAt: new Date(Date.now()-3_600_000).toISOString() },{ id: 'agent-failed', title: 'Preview browser install', detail: 'Browser binary download was unavailable.', state: 'failed', updatedAt: new Date(Date.now()-7_200_000).toISOString(), error: 'Retry when the browser distribution endpoint is reachable.' }] }
  private readonly processed = new Set<string>()
  readStatus() { return { ...this.data, tasks: this.data.tasks.map(task => ({ ...task })) } }
  execute(request: AgentControlRequest) { if (this.processed.has(request.idempotencyKey)) return { accepted: true, message: 'Action already accepted.' }; this.processed.add(request.idempotencyKey); const task = this.data.tasks.find(item => item.id === request.taskId); if (!task) return { accepted: false, message: 'Task not found.' }; const state = request.action === 'stop' ? 'paused' : request.action === 'retry' || request.action === 'start' || request.action === 'resume' ? 'current' : task.state; this.data = { ...this.data, agentStatus: state === 'paused' ? 'paused' : 'running', lastActivity: new Date().toISOString(), tasks: this.data.tasks.map(item => item.id === task.id ? { ...item, state, error: state === 'current' ? undefined : item.error, updatedAt: new Date().toISOString() } : item) }; return { accepted: true, message: `${request.action} accepted for ${task.title}.` } }
}
export class MockAgentControlService extends ProviderBackedAgentControlService { constructor(provider = new MockAgentProvider(), approvals?: ApprovalService) { super(provider, provider, approvals) } }
