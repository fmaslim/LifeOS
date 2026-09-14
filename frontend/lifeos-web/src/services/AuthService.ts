import type { AuthSessionResponse, AuthState } from '../models/auth'

export interface AuthService {
  getSession(): Promise<AuthState>
  signIn(password: string): Promise<AuthState>
  signOut(): Promise<void>
}

const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')
const devBypass = import.meta.env.DEV && import.meta.env.VITE_LIFEOS_DEV_AUTH === 'true'

function endpoint(path: string) {
  return `${apiBase}${path}`
}

async function toAuthState(response: Response): Promise<AuthState> {
  if (response.status === 401) {
    const state = response.headers.get('X-LifeOS-Auth-State')
    return state === 'expired'
      ? { status: 'expired', message: 'Your session expired. Sign in again.' }
      : { status: 'signed-out' }
  }
  if (response.status === 403) return { status: 'unauthorized', message: 'This account is not authorized for LifeOS.' }
  if (response.status === 503) return { status: 'unavailable', message: 'Authentication is not configured on the server.' }
  if (!response.ok) return { status: 'unavailable', message: 'Authentication is temporarily unavailable.' }

  const body = (await response.json()) as AuthSessionResponse
  return body.isAuthenticated
    ? { status: 'signed-in', displayName: body.displayName || 'LifeOS Owner' }
    : { status: 'signed-out', message: body.reason || undefined }
}

export class HttpAuthService implements AuthService {
  async getSession(): Promise<AuthState> {
    if (devBypass) return { status: 'signed-in', displayName: 'Local Developer' }
    try {
      const response = await fetch(endpoint('/api/auth/session'), { credentials: 'include', headers: { Accept: 'application/json' } })
      return await toAuthState(response)
    } catch {
      return { status: 'unavailable', message: 'Cannot reach the LifeOS authentication service.' }
    }
  }

  async signIn(password: string): Promise<AuthState> {
    if (devBypass) return { status: 'signed-in', displayName: 'Local Developer' }
    try {
      const response = await fetch(endpoint('/api/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ password }),
      })
      return await toAuthState(response)
    } catch {
      return { status: 'unavailable', message: 'Cannot reach the LifeOS authentication service.' }
    }
  }

  async signOut(): Promise<void> {
    if (devBypass) return
    try {
      await fetch(endpoint('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    } catch {
      // Local UI still transitions to signed-out; no sensitive state is logged.
    }
  }
}

export const authService: AuthService = new HttpAuthService()
