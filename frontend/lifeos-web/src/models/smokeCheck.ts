import type { ReleaseComponent, ReleaseRecord } from './release'
import type { RouteName } from './shell'

/** The bounded set of user-path categories every production smoke suite covers. */
export type SmokeCheckKind = 'frontend-availability' | 'auth-session-routing' | 'sign-in-gate' | 'api-reachability' | 'protected-read-flow'
export type SmokeCheckStatus = 'passed' | 'failed'

export interface SmokeCheckResult { id: string; kind: SmokeCheckKind; label: string; status: SmokeCheckStatus; message: string; route?: RouteName; checkedAt: string }

/** One check's outcome, produced by a deterministic pure evaluator over a read-only probe result - never by mutating anything. */
export interface SmokeCheckOutcome { status: SmokeCheckStatus; message: string }

export interface SmokeCheckProbe { id: string; kind: SmokeCheckKind; label: string; route?: RouteName; run(): Promise<SmokeCheckOutcome> }

/**
 * One bounded smoke-suite execution, always tied to the deployed revision/build metadata of the
 * component that triggered it (and, since several checks such as auth session routing depend on
 * both the frontend proxy and the backend API, whichever `ReleaseRecord` was current for each
 * component at run time).
 */
export interface SmokeSuiteRun {
  id: string
  triggeredBy: ReleaseComponent
  environment: string
  triggeredAt: string
  status: SmokeCheckStatus
  results: SmokeCheckResult[]
  frontendRelease?: ReleaseRecord
  backendRelease?: ReleaseRecord
}
