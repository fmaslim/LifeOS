export type FailureClassification = 'transient' | 'terminal'
export interface RetryPolicy { maxAttempts: number; baseDelayMs: number; maxDelayMs: number; jitterRatio: number }
export interface RetryContext { attempt: number; maxAttempts: number; idempotencyKey: string; reason: string; delayMs: number }
export interface RetryDependencies { sleep?: (milliseconds: number) => Promise<void>; random?: () => number; beforeRetry?: (context: RetryContext) => void | Promise<void>; onTerminal?: (context: Omit<RetryContext, 'delayMs'>) => void | Promise<void> }
export type RetryOutcome<T> = { status: 'completed'; value: T; attempts: number } | { status: 'failed'; attempts: number; classification: FailureClassification; reason: string }

interface ClassifiableError extends Error { status?: number; code?: string; transient?: boolean }

export function classifyFailure(error: unknown): FailureClassification {
  const candidate = error as ClassifiableError
  if (candidate?.transient === true) return 'transient'
  if (candidate?.status === 408 || candidate?.status === 429 || (candidate?.status !== undefined && candidate.status >= 500)) return 'transient'
  if (candidate?.code && /^(ECONN|ETIMEDOUT|EAI_AGAIN)/.test(candidate.code)) return 'transient'
  return 'terminal'
}

export function backoffDelay(policy: RetryPolicy, failedAttempt: number, random = Math.random) {
  const bounded = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, failedAttempt - 1))
  const jitter = bounded * Math.max(0, Math.min(1, policy.jitterRatio)) * (random() * 2 - 1)
  return Math.max(0, Math.round(bounded + jitter))
}

/** Executes an idempotent operation with bounded recovery. Callers must reuse the supplied key downstream. */
export async function executeWithRetry<T>(idempotencyKey: string, operation: (context: { attempt: number; idempotencyKey: string }) => Promise<T>, policy: RetryPolicy, dependencies: RetryDependencies = {}): Promise<RetryOutcome<T>> {
  const maxAttempts = Math.max(1, Math.floor(policy.maxAttempts)); const sleep = dependencies.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))); const random = dependencies.random ?? Math.random
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try { return { status: 'completed', value: await operation({ attempt, idempotencyKey }), attempts: attempt } }
    catch (error) {
      const classification = classifyFailure(error); const reason = error instanceof Error ? error.message : 'Unknown failure'
      if (classification === 'terminal' || attempt === maxAttempts) { await dependencies.onTerminal?.({ attempt, maxAttempts, idempotencyKey, reason }); return { status: 'failed', attempts: attempt, classification, reason } }
      const delayMs = backoffDelay(policy, attempt, random); await dependencies.beforeRetry?.({ attempt, maxAttempts, idempotencyKey, reason, delayMs }); await sleep(delayMs)
    }
  }
  return { status: 'failed', attempts: maxAttempts, classification: 'terminal', reason: 'Retry policy exhausted' }
}
