export type AgentTaskState = 'current' | 'queued' | 'completed' | 'failed' | 'paused'
export interface AgentTask { id: string; title: string; detail: string; state: AgentTaskState; updatedAt: string; error?: string }
export interface AgentControlData { provider: string; connection: 'connected' | 'unavailable'; agentStatus: 'idle' | 'running' | 'paused' | 'failed'; lastActivity: string; tasks: AgentTask[]; message?: string }
export type AgentControlAction = 'start' | 'stop' | 'resume' | 'retry'
export interface AgentControlRequest { action: AgentControlAction; taskId: string; idempotencyKey: string }
export interface AgentControlResult { accepted: boolean; message: string }
