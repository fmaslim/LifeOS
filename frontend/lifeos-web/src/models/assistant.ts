export type AssistantToolRisk = 'read' | 'write' | 'external-write'
export interface AssistantToolResult { kind: 'answer' | 'approval-required' | 'error'; tool: string; risk: AssistantToolRisk; text: string; links?: Array<{ label: string; route: string }> }
export interface AssistantMessage { id: string; role: 'user' | 'assistant'; text: string; tool?: string; state?: AssistantToolResult['kind'] }
