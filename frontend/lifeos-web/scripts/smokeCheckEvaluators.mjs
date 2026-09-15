// Pure, dependency-free evaluators shared by scripts/smoke-check.mjs and its test.
//
// This intentionally mirrors src/services/SmokeCheckLogic.ts's pass/fail rules rather than
// importing it: this script is a zero-build Node CLI tool (run directly with `node`, the same
// convention as scripts/check-bundle.mjs) that must work without the Vite/TypeScript toolchain
// and without any application-only dependencies, so it can run from a deploy pipeline step or a
// developer's shell against real production URLs. Both sides are covered by tests, so any
// intentional change to one set of rules should be mirrored in the other.

const isHtml = (contentType, body) => /text\/html/i.test(contentType) || /^\s*<!doctype html/i.test(body) || /^\s*<html[\s>]/i.test(body)
const isJson = contentType => /application\/json/i.test(contentType)
const parsesAsJson = body => { try { JSON.parse(body); return true } catch { return false } }

export function evaluateFrontendAvailability({ status, contentType, body }) {
  if (status === 0) return { status: 'failed', message: 'Frontend did not respond (network/DNS failure).' }
  if (status !== 200) return { status: 'failed', message: `Frontend responded with HTTP ${status} instead of 200.` }
  if (!/text\/html/i.test(contentType)) return { status: 'failed', message: `Frontend did not return text/html (received ${contentType || 'no content-type'}).` }
  if (!/<div id="root"|<html[\s>]/i.test(body)) return { status: 'failed', message: 'Frontend document is missing the expected app shell markup.' }
  return { status: 'passed', message: 'Frontend index document loaded with the expected app shell.' }
}

/** The historical regression: nginx's SPA fallback serving index.html for /api/auth/session instead of proxying to the API. */
export function evaluateAuthSessionRouting({ status, contentType, body }) {
  if (status === 0) return { status: 'failed', message: '/api/auth/session did not respond (network/DNS failure).' }
  if (isHtml(contentType, body)) return { status: 'failed', message: `/api/auth/session returned HTML (content-type ${contentType || 'none'}) instead of JSON - the SPA fallback is intercepting this route before it reaches the API.` }
  if (!isJson(contentType)) return { status: 'failed', message: `/api/auth/session did not return application/json (received ${contentType || 'no content-type'}).` }
  if (!parsesAsJson(body)) return { status: 'failed', message: '/api/auth/session response body is not valid JSON.' }
  if (status !== 200 && status !== 401) return { status: 'failed', message: `/api/auth/session returned unexpected HTTP ${status}.` }
  return { status: 'passed', message: 'Session route returns JSON as expected - no SPA-fallback regression.' }
}

export function evaluateSignInGate({ status }) {
  if (status === 0) return { status: 'failed', message: 'Sign-in gate check did not respond (network/DNS failure).' }
  if (status === 200) return { status: 'failed', message: 'Unauthenticated request to a protected route returned HTTP 200 instead of requiring sign-in - the auth gate may be bypassed.' }
  const isRedirect = status >= 300 && status < 400
  if (status !== 401 && status !== 403 && !isRedirect) return { status: 'failed', message: `Unexpected HTTP ${status} for an unauthenticated protected request; expected 401, 403, or a sign-in redirect.` }
  return { status: 'passed', message: `Sign-in gate correctly rejected the unauthenticated request (HTTP ${status}).` }
}

export function evaluateApiReachability({ status, contentType, body }) {
  if (status === 0) return { status: 'failed', message: 'API dependency did not respond (network/DNS failure).' }
  if (status >= 500) return { status: 'failed', message: `API dependency is unavailable (HTTP ${status}).` }
  if (isHtml(contentType, body)) return { status: 'failed', message: `API dependency returned HTML (content-type ${contentType || 'none'}) instead of JSON.` }
  if (!isJson(contentType)) return { status: 'failed', message: `API dependency did not return application/json (received ${contentType || 'no content-type'}).` }
  return { status: 'passed', message: 'Critical API dependency responded with JSON.' }
}

export function evaluateProtectedReadFlow({ status, contentType, body }) {
  if (status === 0) return { status: 'failed', message: 'Protected read-only endpoint did not respond (network/DNS failure).' }
  if (status !== 200) return { status: 'failed', message: `Protected read-only endpoint returned HTTP ${status} instead of 200.` }
  if (isHtml(contentType, body)) return { status: 'failed', message: `Protected read-only endpoint returned HTML (content-type ${contentType || 'none'}) instead of JSON.` }
  if (!isJson(contentType)) return { status: 'failed', message: `Protected read-only endpoint did not return application/json (received ${contentType || 'no content-type'}).` }
  if (!parsesAsJson(body)) return { status: 'failed', message: 'Protected read-only endpoint response body is not valid JSON.' }
  return { status: 'passed', message: 'Representative protected read-only flow returned JSON.' }
}
