#!/usr/bin/env node
// Real, read-only production smoke checks against a live LifeOS deployment.
//
// This is a manual/pipeline tool, NOT wired to run automatically against real infrastructure -
// see docs/architecture.md and issue #139 for why. Invoke it by hand after a deploy, or add it as
// an explicit step in whatever deploy pipeline runs outside this repo (see
// docs/backend-release-lineage.md), with real URLs supplied at invocation time. It never sends
// credentials and only ever issues GET requests, so it is safe to run against production.
//
// Usage:
//   node scripts/smoke-check.mjs --base-url https://getlifeos.co [options]
//
// Options:
//   --base-url <url>        Required. Frontend origin (also fronts /api/* through the reverse proxy).
//   --api-url <url>         Optional. Backend origin to hit directly, bypassing the proxy, so a
//                            failure can be attributed to "backend down" vs. "proxy misrouting".
//   --session-path <path>   Path checked for the /api/auth/session SPA-fallback regression.
//                            Default: /api/auth/session
//   --protected-path <path> Path used for the sign-in-gate and protected-read-flow checks.
//                            Default: /api/tasks
//   --health-path <path>    Path used for the critical-API-reachability check.
//                            Default: /api/health
//   --session-cookie <val>  Optional Cookie header for an authenticated protected-read-flow check.
//                            Never invented by this script - pass it explicitly (e.g. from a CI
//                            secret) or the protected-read-flow check is skipped, not faked.
//   --timeout-ms <n>        Per-request timeout. Default: 8000
//   --json                  Print machine-readable JSON instead of a human-readable report.
//
// Exit code is non-zero when any check fails, so it can gate a pipeline step.

import { evaluateApiReachability, evaluateAuthSessionRouting, evaluateFrontendAvailability, evaluateProtectedReadFlow, evaluateSignInGate } from './smokeCheckEvaluators.mjs'

export function parseArgs(argv) {
  const options = { baseUrl: undefined, apiUrl: undefined, sessionPath: '/api/auth/session', protectedPath: '/api/tasks', healthPath: '/api/health', sessionCookie: undefined, timeoutMs: 8000, json: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => argv[++i]
    if (arg === '--base-url') options.baseUrl = next()
    else if (arg === '--api-url') options.apiUrl = next()
    else if (arg === '--session-path') options.sessionPath = next()
    else if (arg === '--protected-path') options.protectedPath = next()
    else if (arg === '--health-path') options.healthPath = next()
    else if (arg === '--session-cookie') options.sessionCookie = next()
    else if (arg === '--timeout-ms') options.timeoutMs = Number(next())
    else if (arg === '--json') options.json = true
  }
  return options
}

/** A single, read-only GET. Never throws: network/timeout failures resolve to status 0 so callers can evaluate them uniformly. */
export async function get(url, { timeoutMs = 8000, headers = {} } = {}, fetchImpl = fetch) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: controller.signal, headers })
    const body = await response.text().catch(() => '')
    return { status: response.status, contentType: response.headers.get('content-type') ?? '', body }
  } catch {
    return { status: 0, contentType: '', body: '' }
  } finally {
    clearTimeout(timer)
  }
}

/** Runs the full bounded suite against real URLs. Every request is a GET; nothing here writes anything. */
export async function runSmokeSuite(options, fetchImpl = fetch) {
  const results = []
  const requestOptions = { timeoutMs: options.timeoutMs }

  const frontendResponse = await get(options.baseUrl, requestOptions, fetchImpl)
  results.push({ id: 'frontend-availability', label: 'Frontend availability', target: options.baseUrl, ...evaluateFrontendAvailability(frontendResponse) })

  const sessionUrl = new URL(options.sessionPath, options.baseUrl).toString()
  const sessionResponse = await get(sessionUrl, requestOptions, fetchImpl)
  results.push({ id: 'auth-session-routing', label: 'Auth session routing (SPA-fallback regression check)', target: sessionUrl, ...evaluateAuthSessionRouting(sessionResponse) })

  const protectedUrl = new URL(options.protectedPath, options.baseUrl).toString()
  const unauthenticatedResponse = await get(protectedUrl, requestOptions, fetchImpl)
  results.push({ id: 'sign-in-gate', label: 'Sign-in gate (unauthenticated protected request)', target: protectedUrl, ...evaluateSignInGate(unauthenticatedResponse) })

  const healthUrl = new URL(options.healthPath, options.apiUrl ?? options.baseUrl).toString()
  const healthResponse = await get(healthUrl, requestOptions, fetchImpl)
  results.push({ id: 'api-reachability', label: 'Critical API reachability', target: healthUrl, ...evaluateApiReachability(healthResponse) })

  if (options.sessionCookie) {
    const authenticatedResponse = await get(protectedUrl, { ...requestOptions, headers: { Cookie: options.sessionCookie } }, fetchImpl)
    results.push({ id: 'protected-read-flow', label: 'Representative protected read-only flow', target: protectedUrl, ...evaluateProtectedReadFlow(authenticatedResponse) })
  } else {
    results.push({ id: 'protected-read-flow', label: 'Representative protected read-only flow', target: protectedUrl, status: 'skipped', message: 'No --session-cookie supplied; this script never fabricates credentials. Pass one explicitly to exercise the authenticated read flow.' })
  }

  const failed = results.filter(item => item.status === 'failed')
  return { status: failed.length ? 'failed' : 'passed', checkedAt: new Date().toISOString(), baseUrl: options.baseUrl, apiUrl: options.apiUrl, results }
}

function report(suite) {
  const lines = suite.results.map(item => {
    const marker = item.status === 'passed' ? 'PASS' : item.status === 'skipped' ? 'SKIP' : 'FAIL'
    return `[${marker}] ${item.label} (${item.target})\n       ${item.message}`
  })
  return `Production smoke checks: ${suite.status.toUpperCase()} (${suite.checkedAt})\n${lines.join('\n')}`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.baseUrl) {
    console.error('Usage: node scripts/smoke-check.mjs --base-url <frontend-origin> [--api-url <backend-origin>] [options]')
    process.exitCode = 2
    return
  }
  const suite = await runSmokeSuite(options)
  console.log(options.json ? JSON.stringify(suite, null, 2) : report(suite))
  if (suite.status === 'failed') process.exitCode = 1
}

// Only run when invoked directly (`node scripts/smoke-check.mjs`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) await main()
