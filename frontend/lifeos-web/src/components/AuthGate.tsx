import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { AuthState } from '../models/auth'
import type { CalendarEvent } from '../models/calendar'
import { authService } from '../services/AuthService'
import { calendarProviderService } from '../services/CalendarProviderService'
import { cloudSyncService } from '../services/CloudSyncService'
import { docIQProviderService } from '../services/DocIQProviderService'
import { financeProviderService } from '../services/FinanceProviderService'
import { homeProviderService } from '../services/HomeProviderService'
import { localStore } from '../storage/LocalStore'
import { storageKeys } from '../storage/storageKeys'
import './AuthGate.css'

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    authService.getSession().then(next => { if (active) setState(next) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (state.status !== 'signed-in') { setWorkspaceReady(false); return }
    let active = true
    Promise.all([cloudSyncService.sync(), calendarProviderService.refresh(), docIQProviderService.refresh(), financeProviderService.refresh(), homeProviderService.refresh()]).then(([, calendar]) => {
      if (calendar.status === 'connected' || calendar.status === 'stale') {
        const existing = localStore.read<CalendarEvent[]>(storageKeys.calendar, [])
        const localOnly = existing.filter(event => !event.id.startsWith('provider-calendar-'))
        localStore.write(storageKeys.calendar, [...localOnly, ...calendar.events])
      }
      if (active) setWorkspaceReady(true)
    }).catch(() => { if (active) setWorkspaceReady(true) })
    return () => { active = false }
  }, [state.status])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    const next = await authService.signIn(password)
    setPassword('')
    setState(next)
    setSubmitting(false)
  }

  if (state.status === 'loading' || (state.status === 'signed-in' && !workspaceReady)) {
    return <main className="auth-shell" aria-busy="true"><div className="auth-card"><span className="auth-mark">L</span><p className="auth-kicker">LifeOS</p><h1>Opening your workspace</h1><p className="auth-copy">Verifying your protected session and connected sources…</p></div></main>
  }

  if (state.status === 'signed-in') return <>{children}</>

  const message = state.message ?? (state.status === 'signed-out' ? 'Sign in to access your private LifeOS workspace.' : 'Your protected session needs attention.')

  return (
    <main className="auth-shell" id="main-content">
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-mark">L</span>
        <p className="auth-kicker">Private workspace</p>
        <h1 id="auth-title">Welcome back</h1>
        <p className="auth-copy">{message}</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="lifeos-password">Owner password</label>
          <input id="lifeos-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required disabled={submitting} />
          <button type="submit" disabled={submitting || !password}>{submitting ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {state.status === 'expired' && <p className="auth-note">Your previous session expired safely. No local token is stored by LifeOS.</p>}
        {state.status === 'unauthorized' && <p className="auth-note">The server rejected access to this workspace.</p>}
        {state.status === 'unavailable' && <button className="auth-retry" type="button" onClick={() => { setState({ status: 'loading' }); authService.getSession().then(setState) }}>Retry connection</button>}
      </section>
    </main>
  )
}
