import { useCallback, useState } from 'react'
import type { ReleaseComponent } from '../models/release'
import type { SmokeSuiteRun } from '../models/smokeCheck'
import type { SmokeCheckService } from '../services/SmokeCheckService'
import { LoadingState } from './PageState'
import './SmokeChecksPage.css'

export function SmokeChecksPage({ service }: { service: SmokeCheckService }) {
  const [run, setRun] = useState<SmokeSuiteRun | undefined>(service.last())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const trigger = useCallback((component: ReleaseComponent) => {
    setPending(true); setError('')
    void service.run(component).then(result => { setRun(result); setPending(false) }).catch(() => { setError('Smoke checks could not be completed.'); setPending(false) })
  }, [service])

  return <div className="dashboard smoke-checks-page">
    <section className="welcome">
      <div>
        <p className="eyebrow">Deployment verification</p>
        <h1>Production Smoke Checks</h1>
        <p className="subtitle">Bounded, read-only checks for frontend availability, auth session routing, the sign-in gate, critical API reachability, and a representative protected read-only flow - run after every production deployment.</p>
      </div>
      <div className="smoke-actions">
        <button className="primary-button" onClick={() => trigger('frontend')} disabled={pending}>Run after frontend deploy</button>
        <button className="secondary-button" onClick={() => trigger('backend')} disabled={pending}>Run after backend deploy</button>
      </div>
    </section>
    {pending && <LoadingState title="Running smoke checks" description="Bounded, read-only checks against the current deployment." />}
    {error && <p className="health-error">{error}</p>}
    {!run && !pending && !error && <p className="smoke-empty">No smoke suite has run yet in this session. Trigger a run above, the same way a deploy pipeline step would after a frontend or backend release.</p>}
    {run && <>
      <section className={`health-summary ${run.status === 'passed' ? 'healthy' : 'unavailable'}`}>
        <strong>{run.status}</strong>
        <span>Triggered by {run.triggeredBy} deploy · {new Date(run.triggeredAt).toLocaleString()}</span>
        {run.frontendRelease && <span>Frontend {run.frontendRelease.revisionId} ({run.frontendRelease.commitSha.slice(0, 12)})</span>}
        {run.backendRelease && <span>Backend {run.backendRelease.revisionId} ({run.backendRelease.commitSha.slice(0, 12)})</span>}
      </section>
      <section className="health-grid">
        {run.results.map(result => <article className="panel health-card" key={result.id}>
          <div><span className={`health-dot ${result.status === 'passed' ? 'healthy' : 'unavailable'}`} /> <strong>{result.label}</strong></div>
          <span className="health-state">{result.status}</span>
          <p>{result.message}</p>
          {result.route && <a href={`#/${result.route}`}>Open related workspace</a>}
        </article>)}
      </section>
    </>}
  </div>
}
