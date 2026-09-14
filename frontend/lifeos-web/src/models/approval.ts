export type ApprovalRisk = 'low' | 'medium' | 'high' | 'critical'
export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed'

export interface ApprovalRequest {
  id: string
  source: string
  action: string
  summary: string
  risk: ApprovalRisk
  createdAt: string
  expiresAt?: string
  payloadPreview?: Record<string, unknown>
  correlationId?: string
  runId?: string
  state: ApprovalState
  decidedAt?: string
  executedAt?: string
}

export interface ApprovalInput {
  source: string
  action: string
  summary: string
  risk: ApprovalRisk
  expiresAt?: string
  payloadPreview?: Record<string, unknown>
  correlationId?: string
  runId?: string
}
