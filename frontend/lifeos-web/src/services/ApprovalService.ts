import type { ApprovalInput, ApprovalRequest, ApprovalState } from '../models/approval'
import type { ActivityService } from './ActivityService'

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
type ResumeHandler = () => void | Promise<void>
const KEY = 'lifeos:approval-inbox:v1'
const secretKey = /token|secret|password|credential|api[-_]?key|authorization|cookie/i

export function sanitizeApprovalPreview(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined
  const clean = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(clean)
    if (!input || typeof input !== 'object') return input
    return Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([key]) => !secretKey.test(key)).map(([key, item]) => [key, clean(item)]))
  }
  return clean(value) as Record<string, unknown>
}

export class ApprovalService {
  private requests: ApprovalRequest[]
  private readonly resumeHandlers = new Map<string, ResumeHandler>()
  private readonly executing = new Set<string>()
  constructor(private readonly activity?: ActivityService, private readonly storage?: StorageLike) { this.requests = this.restore() }
  private restore() { try { const parsed = JSON.parse(this.storage?.getItem(KEY) ?? '[]'); return Array.isArray(parsed) ? parsed as ApprovalRequest[] : [] } catch { return [] } }
  private save() { this.storage?.setItem(KEY, JSON.stringify(this.requests)) }
  private expire(now = new Date()) { const stamp = now.toISOString(); let changed = false; this.requests = this.requests.map(item => item.state === 'pending' && item.expiresAt && item.expiresAt <= stamp ? (changed = true, { ...item, state: 'expired' as const, decidedAt: stamp }) : item); if (changed) this.save() }
  list(state?: ApprovalState) { this.expire(); return this.requests.filter(item => !state || item.state === state).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(item => ({ ...item, payloadPreview: item.payloadPreview ? { ...item.payloadPreview } : undefined })) }
  request(input: ApprovalInput, resume?: ResumeHandler): ApprovalRequest {
    this.expire()
    const dedupe = input.correlationId ? this.requests.find(item => item.correlationId === input.correlationId && item.action === input.action && !['rejected','expired'].includes(item.state)) : undefined
    if (dedupe) { if (resume) this.resumeHandlers.set(dedupe.id, resume); return { ...dedupe } }
    const createdAt = new Date().toISOString()
    const request: ApprovalRequest = { ...input, id: `approval-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`, createdAt, state: 'pending', payloadPreview: sanitizeApprovalPreview(input.payloadPreview) }
    this.requests.push(request); if (resume) this.resumeHandlers.set(request.id, resume); this.save(); this.audit(request, 'Approval requested')
    return { ...request }
  }
  decide(id: string, decision: 'approved' | 'rejected'): ApprovalRequest | undefined {
    this.expire(); const index = this.requests.findIndex(item => item.id === id); if (index < 0) return undefined
    const current = this.requests[index]!; if (current.state !== 'pending') return { ...current }
    const updated = { ...current, state: decision, decidedAt: new Date().toISOString() } as ApprovalRequest
    this.requests[index] = updated; if (decision === 'rejected') this.resumeHandlers.delete(id); this.save(); this.audit(updated, decision === 'approved' ? 'Approval granted' : 'Approval rejected'); return { ...updated }
  }
  async executeApproved(id: string): Promise<ApprovalRequest | undefined> {
    const current = this.requests.find(item => item.id === id); if (!current || current.state === 'executed' || current.state !== 'approved' || this.executing.has(id)) return current ? { ...current } : undefined
    this.executing.add(id)
    try { const handler = this.resumeHandlers.get(id); if (handler) await handler(); return this.markExecuted(id) }
    finally { this.executing.delete(id) }
  }
  markExecuted(id: string): ApprovalRequest | undefined {
    const index = this.requests.findIndex(item => item.id === id); if (index < 0) return undefined
    const current = this.requests[index]!; if (current.state === 'executed') return { ...current }; if (current.state !== 'approved') return { ...current }
    const updated = { ...current, state: 'executed' as const, executedAt: new Date().toISOString() }; this.requests[index] = updated; this.resumeHandlers.delete(id); this.save(); this.audit(updated, 'Approved action executed'); return { ...updated }
  }
  canExecute(id: string) { const item = this.list().find(request => request.id === id); return item?.state === 'approved' && !this.executing.has(id) }
  private audit(item: ApprovalRequest, type: string) { this.activity?.publish({ id: `approval-audit-${item.id}-${item.state}`, timestamp: new Date().toISOString(), source: 'Approvals', type, description: `${item.source}: ${item.summary}`, status: item.state === 'rejected' || item.state === 'expired' ? 'attention' : 'info', route: 'approvals', correlationId: item.correlationId, runId: item.runId, important: item.risk === 'high' || item.risk === 'critical' }) }
}

export const approvalService = new ApprovalService(undefined, typeof localStorage === 'undefined' ? undefined : localStorage)
