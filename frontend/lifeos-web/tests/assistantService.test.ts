import assert from 'node:assert/strict'
import test from 'node:test'
import { LifeOSAssistantService } from '../src/services/AssistantService.ts'

const dependencies = () => ({ dailyBrief: { getDailyBrief: () => ({ generatedAt: '', greeting: '', actions: [{ id: 'one', title: 'Review failures', reason: 'One run failed', route: 'automation-history' as const, priority: 'high' as const }], signals: [], warnings: [] }) }, automationHistory: { list: () => [{ id: 'run', automationId: 'sync', automationName: 'Ledger Sync', trigger: 'Schedule', startedAt: '', endedAt: '', durationMs: 1, status: 'failed' as const, outputSummary: '', retryCount: 2, relatedLinks: [] }] }, jarvis: { getJarvisData: () => ({ connection: 'connected' as const, providerName: 'LinLoop Reach', fetchedAt: '', status: 'Ready' as const, statusDetail: '', lastRun: '', nextRun: '', metrics: [{ label: 'Replies', value: '7', detail: '', icon: 'mail' as const, tone: 'green' as const }], qualifiedProspects: [], outreachQueue: [], activity: [] }) }, content: { getProviderStatus: () => 'configured' as const, generateShortContent: async () => ({ format: 'short' as const, title: 'Today package', tags: ['one'] }), generateLongContent: async () => ({ format: 'long' as const, title: 'Long' }) } })

test('safe read questions execute without approval', async () => {
  const assistant = new LifeOSAssistantService(dependencies())
  assert.equal((await assistant.ask('What failed overnight?')).kind, 'answer'); assert.match((await assistant.ask('How is Jarvis performing?')).text, /Replies: 7/); assert.match((await assistant.ask('What should I work on today?')).text, /Review failures/)
})

test('external writes require approval before tool execution', async () => {
  let generated = 0; const deps = dependencies(); deps.content.generateShortContent = async () => { generated += 1; return { format: 'short', title: 'Today package', tags: ['one'] } }
  const assistant = new LifeOSAssistantService(deps); const pending = await assistant.ask("Generate today's content")
  assert.equal(pending.kind, 'approval-required'); assert.equal(generated, 0); const approved = await assistant.ask("Generate today's content", true); assert.equal(approved.kind, 'answer'); assert.equal(generated, 1)
})

test('tool failures are isolated and explained', async () => {
  const deps = dependencies(); deps.dailyBrief.getDailyBrief = () => { throw new Error('brief offline') }
  const result = await new LifeOSAssistantService(deps).ask('What should I do?'); assert.equal(result.kind, 'error'); assert.match(result.text, /brief offline/)
})
