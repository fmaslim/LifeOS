import { useMemo, useState } from 'react'
import type { WeeklyPriority, WeeklyReview } from '../models/weeklyReview'
import type { WeeklyReviewService } from '../services/WeeklyReviewService'
import './WeeklyReviewPage.css'

export function WeeklyReviewPage({ service }: { service: WeeklyReviewService }) {
  const [version, setVersion] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(() => service.list()[0]?.id ?? null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const reviews = useMemo(() => service.list(), [service, version])
  const selected = reviews.find(review => review.id === selectedId) ?? reviews[0]
  const refresh = () => setVersion(value => value + 1)

  const run = () => { const review = service.run(new Date(), 'Manual'); setSelectedId(review.id); refresh() }
  const beginEdit = (priority: WeeklyPriority) => { setEditingId(priority.id); setDraftTitle(priority.title) }
  const saveEdit = (review: WeeklyReview, priority: WeeklyPriority) => { service.editPriority(review.id, priority.id, draftTitle); setEditingId(null); refresh() }

  return <div className="weekly-review-page dashboard">
    <section className="weekly-review-hero">
      <div><p className="eyebrow">Operating review</p><h1>Weekly Review</h1><p className="subtitle">See what moved, what slipped, and what deserves focus next week.</p></div>
      <button className="primary-button" onClick={run}>Run weekly review</button>
    </section>

    <section className="weekly-review-layout">
      <aside className="panel weekly-review-history">
        <div className="panel-heading"><div><p className="eyebrow">History</p><h2>Prior reviews</h2></div></div>
        {reviews.length ? reviews.map(review => <button key={review.id} className={review.id === selected?.id ? 'active' : ''} onClick={() => setSelectedId(review.id)}><strong>Week of {review.weekOf}</strong><span>{review.trigger} · {new Date(review.generatedAt).toLocaleString()}</span></button>) : <p>No weekly reviews yet.</p>}
      </aside>

      <div className="weekly-review-main">
        {!selected ? <section className="panel weekly-review-empty"><h2>No review yet</h2><p>Run the Weekly Review to build your first cross-LifeOS operating summary.</p></section> : <>
          <section className="panel weekly-review-summary">
            <div className="panel-heading"><div><p className="eyebrow">Week of {selected.weekOf}</p><h2>{selected.summary}</h2></div><span>{selected.trigger}</span></div>
            <div className="weekly-review-metrics">
              <div><strong>{selected.metrics.completedTasks}</strong><span>tasks completed</span></div>
              <div><strong>{selected.metrics.overdueTasks}</strong><span>overdue tasks</span></div>
              <div><strong>{selected.metrics.atRiskKpis}</strong><span>KPIs at risk</span></div>
              <div><strong>{selected.metrics.completedProjects}</strong><span>projects completed</span></div>
              <div><strong>{selected.metrics.publishedContent}</strong><span>content published</span></div>
              <div><strong>{selected.metrics.failedAutomations}</strong><span>automation failures</span></div>
            </div>
            {selected.warnings.length > 0 && <div className="weekly-review-warnings"><strong>Degraded sources</strong>{selected.warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
          </section>

          <section className="panel weekly-review-signals">
            <div className="panel-heading"><div><p className="eyebrow">Evidence</p><h2>Wins, misses & anomalies</h2></div></div>
            <div className="weekly-review-signal-list">{selected.signals.map(signal => <article key={signal.id} className={`weekly-review-signal ${signal.kind}`}><header><span>{signal.kind}</span><strong>{signal.source}</strong></header><h3>{signal.title}</h3><p>{signal.detail}</p>{signal.route && <a href={`#/${signal.route}`}>Open source →</a>}</article>)}</div>
          </section>

          <section className="panel weekly-review-priorities">
            <div className="panel-heading"><div><p className="eyebrow">Next week</p><h2>Proposed priorities</h2></div><a href="#/approvals">Approval Inbox</a></div>
            {selected.priorities.length ? selected.priorities.map(priority => {
              const cited = selected.signals.filter(signal => priority.signalIds.includes(signal.id))
              return <article key={priority.id} className={`weekly-priority ${priority.state}`}>
                <div className="weekly-priority-copy">
                  <span className="priority-state">{priority.state}</span>
                  {editingId === priority.id ? <div className="priority-editor"><input value={draftTitle} onChange={event => setDraftTitle(event.target.value)} aria-label="Priority title" /><button onClick={() => saveEdit(selected, priority)}>Save</button><button onClick={() => setEditingId(null)}>Cancel</button></div> : <h3>{priority.title}</h3>}
                  <p>{priority.reason}</p>
                  <div className="priority-citations"><strong>Based on:</strong>{cited.map(signal => <span key={signal.id}>{signal.source}: {signal.title}</span>)}</div>
                </div>
                {priority.state === 'proposed' && <footer><button onClick={() => beginEdit(priority)}>Edit</button><button onClick={() => { service.dismissPriority(selected.id, priority.id); refresh() }}>Dismiss</button><button className="primary-button" onClick={() => { service.requestPriority(selected.id, priority.id); refresh() }}>Request approval</button></footer>}
                {priority.state === 'awaiting-approval' && <footer><a className="primary-button" href="#/approvals">Review approval</a></footer>}
                {priority.state === 'accepted' && <footer><a href="#/tasks">Open created task →</a></footer>}
              </article>
            }) : <p>No priorities were proposed for this review.</p>}
          </section>
        </>}
      </div>
    </section>
  </div>
}
