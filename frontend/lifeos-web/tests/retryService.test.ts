import assert from 'node:assert/strict'
import test from 'node:test'
import { backoffDelay, classifyFailure, executeWithRetry } from '../src/services/RetryService.ts'

test('classifies transient and terminal failures', () => {
  assert.equal(classifyFailure(Object.assign(new Error('busy'), { status: 503 })), 'transient')
  assert.equal(classifyFailure(Object.assign(new Error('rate limited'), { status: 429 })), 'transient')
  assert.equal(classifyFailure(Object.assign(new Error('invalid'), { status: 400 })), 'terminal')
})

test('backoff grows exponentially, caps, and applies bounded jitter', () => {
  const policy = { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 250, jitterRatio: .2 }
  assert.equal(backoffDelay(policy, 1, () => .5), 100)
  assert.equal(backoffDelay(policy, 2, () => .5), 200)
  assert.equal(backoffDelay(policy, 3, () => .5), 250)
  assert.equal(backoffDelay(policy, 1, () => 1), 120)
})

test('transient failures retry with one idempotency key and stop at the bound', async () => {
  const attempts: string[] = []; const delays: number[] = []
  const result = await executeWithRetry('job:occurrence', async context => { attempts.push(context.idempotencyKey); throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) }, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, jitterRatio: 0 }, { sleep: async delay => { delays.push(delay) }, random: () => .5 })
  assert.equal(result.status, 'failed'); assert.equal(result.attempts, 3); assert.deepEqual(attempts, ['job:occurrence','job:occurrence','job:occurrence']); assert.deepEqual(delays, [10,20])
})

test('terminal failures stop without retrying', async () => {
  let attempts = 0
  const result = await executeWithRetry('job:bad-input', async () => { attempts += 1; throw Object.assign(new Error('invalid request'), { status: 400 }) }, { maxAttempts: 5, baseDelayMs: 10, maxDelayMs: 100, jitterRatio: 0 }, { sleep: async () => undefined })
  assert.equal(result.status, 'failed'); assert.equal(attempts, 1)
})
