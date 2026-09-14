import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { ApprovalService, sanitizeApprovalPreview } from '../src/services/ApprovalService.ts'

class MemoryStorage { value = ''; getItem() { return this.value || null }; setItem(_key: string, value: string) { this.value = value } }

test('approval requests sanitize previews and transition deterministically', async () => {
  const storage = new MemoryStorage()
  const service = new ApprovalService(undefined, storage)
  let executed = 0
  const request = service.request({ source: 'Test', action: 'test.write', summary: 'Write data', risk: 'high', correlationId: 'corr-1', payloadPreview: { name: 'safe', token: 'secret', nested: { password: 'hidden', value: 7 } } }, () => { executed++ })
  assert.equal(request.state, 'pending')
  assert.deepEqual(request.payloadPreview, { name: 'safe', nested: { value: 7 } })
  assert.equal(service.request({ source: 'Test', action: 'test.write', summary: 'Write data', risk: 'high', correlationId: 'corr-1' }).id, request.id)
  service.decide(request.id, 'approved')
  assert.equal(service.canExecute(request.id), true)
  await service.executeApproved(request.id)
  await service.executeApproved(request.id)
  assert.equal(executed, 1)
  assert.equal(service.list('executed').length, 1)
})

test('rejected and expired approvals cannot execute', () => {
  const service = new ApprovalService(undefined, new MemoryStorage())
  const rejected = service.request({ source: 'Test', action: 'delete', summary: 'Delete', risk: 'critical', correlationId: 'reject' })
  service.decide(rejected.id, 'rejected')
  assert.equal(service.canExecute(rejected.id), false)
  const expired = service.request({ source: 'Test', action: 'send', summary: 'Send', risk: 'medium', correlationId: 'expire', expiresAt: '2000-01-01T00:00:00.000Z' })
  assert.equal(service.list().find(item => item.id === expired.id)?.state, 'expired')
})

test('secret-shaped keys are recursively excluded from approval previews', () => {
  assert.deepEqual(sanitizeApprovalPreview({ credential: 'x', safe: 1, child: { apiKey: 'x', label: 'ok' } }), { safe: 1, child: { label: 'ok' } })
})

test('AI, agent, calendar, automation, and content actions use the shared approval layer', () => {
  const assistant = readFileSync(join(process.cwd(), 'src/services/AssistantService.ts'), 'utf8')
  const agent = readFileSync(join(process.cwd(), 'src/services/AgentControlService.ts'), 'utf8')
  const calendar = readFileSync(join(process.cwd(), 'src/services/CalendarProviderService.ts'), 'utf8')
  const gates = readFileSync(join(process.cwd(), 'src/services/ApprovalGates.ts'), 'utf8')
  const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
  assert.match(assistant, /approvals\.request/)
  assert.match(agent, /approvalService\.request/)
  assert.match(calendar, /approvalService\.request/)
  assert.match(gates, /queueAutomationAction/)
  assert.match(gates, /queueContentAction/)
  assert.match(app, /ApprovalInboxPage/)
})
