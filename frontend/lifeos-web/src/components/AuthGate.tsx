import { FormEvent, ReactNode, useEffect, useState } from 'react'
import type { AuthState } from '../models/auth'
import { authService } from '../services/AuthService'
import './AuthGate.css'

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    authService.getSession().then(next => { if (active) setState(next) })
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password || submitting) return
    setSubmitting(true)
    const next = await authService.signIn(password)
    setPassword('')
    setState(next)
    setSubmitting(false)
  }

  if (state.status === 'loading') {
    return <main className="auth-shell" aria-busy="true"><div className="auth-card"><span className="auth-mark">L</span><p className="auth-kicker">LifeOS</p><h1>Opening your workspace</h1><p className="auth-copy">Verifying your protected session…</p></div></main>
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
