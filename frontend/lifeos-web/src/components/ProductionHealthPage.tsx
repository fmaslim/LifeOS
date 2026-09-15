import { useCallback, useEffect, useState } from 'react'
import type { ProductionHealthSnapshot } from '../models/productionHealth'
import type { ProductionHealthService } from '../services/ProductionHealthService'
import { LoadingState } from './PageState'
import './ProductionHealthPage.css'

export function ProductionHealthPage({ service }: { service: ProductionHealthService }) {
  const [snapshot, setSnapshot] = useState<ProductionHealthSnapshot>(); const [error, setError] = useState('')
  const refresh = useCallback(() => { setError(''); void service.check().then(setSnapshot).catch(() => setError('Health checks could not be completed.')) }, [service])
  useEffect(refresh, [refresh])
  if (!snapshot && !error) return <div className="dashboard"><LoadingState title="Checking production" description="Running bounded, read-only checks." /></div>
  return <div className="dashboard production-health"><section className="welcome"><div><p className="eyebrow">Operations</p><h1>Production Health</h1><p className="subtitle">Frontend, API, authentication, persistence, and provider status in one place.</p></div><button className="primary-button" onClick={refresh}>Run checks</button></section>{error ? <p className="health-error">{error}</p> : <><section className={`health-summary ${snapshot!.state}`}><strong>{snapshot!.state}</strong><span>Checked {new Date(snapshot!.checkedAt).toLocaleString()}</span>{snapshot!.lastSuccessfulAt && <span>Last all-green {new Date(snapshot!.lastSuccessfulAt).toLocaleString()}</span>}</section><section className="health-grid">{snapshot!.checks.map(check => <article className="panel health-card" key={check.id}><div><span className={`health-dot ${check.state}`} /> <strong>{check.label}</strong></div><span className="health-state">{check.state}</span><p>{check.message}</p>{(check.revision || check.buildId) && <small>{check.revision && `Revision ${check.revision}`}{check.revision && check.buildId && ' · '}{check.buildId && `Build ${check.buildId}`}</small>}{check.route && <a href={`#/${check.route}`}>Open related workspace</a>}</article>)}</section></>}</div>
}
