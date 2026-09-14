import type { ApprovalService } from './ApprovalService'

export function queueAutomationAction(approvals: ApprovalService, input: { automationId: string; action: string; runId?: string }, resume: () => void | Promise<void>) {
  return approvals.request({ source: 'Automations', action: `automation.${input.action}`, summary: `${input.action} automation ${input.automationId}`, risk: 'high', correlationId: `${input.automationId}:${input.action}:${input.runId ?? 'manual'}`, runId: input.runId, payloadPreview: { automationId: input.automationId, action: input.action } }, resume)
}

export function queueContentAction(approvals: ApprovalService, input: { action: string; artifactId?: string; summary: string }, resume: () => void | Promise<void>) {
  return approvals.request({ source: 'Content', action: `content.${input.action}`, summary: input.summary, risk: 'medium', correlationId: `${input.action}:${input.artifactId ?? input.summary}`, payloadPreview: { artifactId: input.artifactId, action: input.action } }, resume)
}
