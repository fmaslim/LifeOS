import type { SmokeCheckOutcome } from '../models/smokeCheck'

/** A minimal, provider-neutral shape for a probe's read-only HTTP result - real or simulated. */
export interface ProbeResponse { status: number; contentType: string; body: string }

const isHtml = (response: ProbeResponse) => /text\/html/i.test(response.contentType) || /^\s*<!doctype html/i.test(response.body) || /^\s*<html[\s>]/i.test(response.body)
const isJson = (response: ProbeResponse) => /application\/json/i.test(response.contentType)
const parsesAsJson = (body: string) => { try { JSON.parse(body); return true } catch { return false } }

/** The frontend's index document must actually load and serve the SPA shell, not an error page or an empty response. */
export function evaluateFrontendAvailability(response: ProbeResponse): SmokeCheckOutcome {
  if (response.status === 0) return { status: 'failed', message: 'Frontend did not respond (network/DNS failure).' }
  if (response.status !== 200) return { status: 'failed', message: `Frontend responded with HTTP ${response.status} instead of 200.` }
  if (!/text\/html/i.test(response.contentType)) return { status: 'failed', message: `Frontend did not return text/html (received ${response.contentType || 'no content-type'}).` }
  if (!/<div id="root"|<html[\s>]/i.test(response.body)) return { status: 'failed', message: 'Frontend document is missing the expected app shell markup.' }
  return { status: 'passed', message: 'Frontend index document loaded with the expected app shell.' }
}

/**
 * The historical regression this check exists for: nginx's SPA fallback (`try_files ... /index.html`)
 * intercepting `/api/auth/session` before it reached the API proxy, so the browser received the
 * SPA's `index.html` (HTML, 200) instead of the session JSON. Any HTML response - by content-type
 * OR by body sniff, since a misconfigured proxy can still claim `text/html` incorrectly or omit a
 * content-type - must fail this check outright, before anything else is evaluated.
 */
export function evaluateAuthSessionRouting(response: ProbeResponse): SmokeCheckOutcome {
  if (response.status === 0) return { status: 'failed', message: '/api/auth/session did not respond (network/DNS failure).' }
  if (isHtml(response)) return { status: 'failed', message: `/api/auth/session returned HTML (content-type ${response.contentType || 'none'}) instead of JSON - the SPA fallback is intercepting this route before it reaches the API.` }
  if (!isJson(response)) return { status: 'failed', message: `/api/auth/session did not return application/json (received ${response.contentType || 'no content-type'}).` }
  if (!parsesAsJson(response.body)) return { status: 'failed', message: '/api/auth/session response body is not valid JSON.' }
  if (response.status !== 200 && response.status !== 401) return { status: 'failed', message: `/api/auth/session returned unexpected HTTP ${response.status}.` }
  return { status: 'passed', message: 'Session route returns JSON as expected - no SPA-fallback regression.' }
}

/**
 * An unauthenticated request to a protected route must be rejected (401/403, or a sign-in
 * redirect), never answered with HTTP 200. A 200 here would mean the sign-in gate is bypassed.
 */
export function evaluateSignInGate(response: ProbeResponse): SmokeCheckOutcome {
  if (response.status === 0) return { status: 'failed', message: 'Sign-in gate check did not respond (network/DNS failure).' }
  if (response.status === 200) return { status: 'failed', message: 'Unauthenticated request to a protected route returned HTTP 200 instead of requiring sign-in - the auth gate may be bypassed.' }
  const isRedirect = response.status >= 300 && response.status < 400
  if (response.status !== 401 && response.status !== 403 && !isRedirect) return { status: 'failed', message: `Unexpected HTTP ${response.status} for an unauthenticated protected request; expected 401, 403, or a sign-in redirect.` }
  return { status: 'passed', message: `Sign-in gate correctly rejected the unauthenticated request (HTTP ${response.status}).` }
}

/** A critical, unauthenticated API dependency (e.g. a health/status endpoint) must be reachable and return JSON. */
export function evaluateApiReachability(response: ProbeResponse): SmokeCheckOutcome {
  if (response.status === 0) return { status: 'failed', message: 'API dependency did not respond (network/DNS failure).' }
  if (response.status >= 500) return { status: 'failed', message: `API dependency is unavailable (HTTP ${response.status}).` }
  if (isHtml(response)) return { status: 'failed', message: `API dependency returned HTML (content-type ${response.contentType || 'none'}) instead of JSON.` }
  if (!isJson(response)) return { status: 'failed', message: `API dependency did not return application/json (received ${response.contentType || 'no content-type'}).` }
  return { status: 'passed', message: 'Critical API dependency responded with JSON.' }
}

/** A representative authenticated, read-only flow (e.g. listing tasks) must return the expected JSON shape - this never mutates anything. */
export function evaluateProtectedReadFlow(response: ProbeResponse, hasExpectedShape: boolean): SmokeCheckOutcome {
  if (response.status === 0) return { status: 'failed', message: 'Protected read-only endpoint did not respond (network/DNS failure).' }
  if (response.status !== 200) return { status: 'failed', message: `Protected read-only endpoint returned HTTP ${response.status} instead of 200.` }
  if (isHtml(response)) return { status: 'failed', message: `Protected read-only endpoint returned HTML (content-type ${response.contentType || 'none'}) instead of JSON.` }
  if (!isJson(response)) return { status: 'failed', message: `Protected read-only endpoint did not return application/json (received ${response.contentType || 'no content-type'}).` }
  if (!parsesAsJson(response.body)) return { status: 'failed', message: 'Protected read-only endpoint response body is not valid JSON.' }
  if (!hasExpectedShape) return { status: 'failed', message: 'Protected read-only endpoint returned an unexpected payload shape.' }
  return { status: 'passed', message: 'Representative protected read-only flow returned the expected data shape.' }
}
