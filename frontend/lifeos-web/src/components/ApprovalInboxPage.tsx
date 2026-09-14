import { useMemo, useState } from 'react'
import type { ApprovalState } from '../models/approval'
import type { ApprovalService } from '../services/ApprovalService'
import './ApprovalInboxPage.css'

const states: ApprovalState[] = ['pending', 'approved', 'rejected', 'expired', 'executed']

export function ApprovalInboxPage({ service }: { service: ApprovalService }) {
  const [filter, setFilter] = useState<ApprovalState>('pending')
  const [version, setVersion] = useState(0)
  const items = useMemo(() => service.list(filter), [service, filter, version])
  const refresh = () => setVersion(value => value + 1)
  return <div className="approval-page dashboard">
    <section className="approval-hero"><div><p className="eyebrow">Safety & control</p><h1>Approval Inbox</h1><p className="subtitle">Review external writes, destructive actions, and high-impact automation steps before anything runs.</p></div><span className="approval-count">{service.list('pending').length} pending</span></section>
    <nav className="approval-tabs" aria-label="Approval states">{states.map(state => <button key={state} className={filter === state ? 'active' : ''} onClick={() => setFilter(state)}>{state[0].toUpperCase() + state.slice(1)} <span>{service.list(state).length}</span></button>)}</nav>
    <section className="approval-list">{items.length ? items.map(item => <article className="panel approval-card" key={item.id}>
      <header><div><span className={`approval-risk ${item.risk}`}>{item.risk} risk</span><p>{item.source}</p><h2>{item.summary}</h2></div><span className={`approval-state ${item.state}`}>{item.state}</span></header>
      <dl><div><dt>Action</dt><dd>{item.action}</dd></div><div><dt>Created</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></div>{item.expiresAt && <div><dt>Expires</dt><dd>{new Date(item.expiresAt).toLocaleString()}</dd></div>}{item.correlationId && <div><dt>Correlation</dt><dd>{item.correlationId}</dd></div>}</dl>
      {item.payloadPreview && <details><summary>Payload preview</summary><pre>{JSON.stringify(item.payloadPreview, null, 2)}</pre></details>}
      {item.state === 'pending' && <footer><button className="approval-reject" onClick={() => { service.decide(item.id, 'rejected'); refresh() }}>Reject</button><button className="primary-button" onClick={() => { service.decide(item.id, 'approved'); refresh() }}>Approve</button></footer>}
      {item.state === 'approved' && <footer><button className="primary-button" onClick={() => { service.markExecuted(item.id); refresh() }}>Mark executed</button></footer>}
    </article>) : <div className="panel approval-empty"><h2>No {filter} approvals</h2><p>Requests will appear here when a LifeOS workflow needs explicit permission.</p></div>}</section>
  </div>
}
