import type { DailyBriefData } from '../models/dailyBrief'
import { EmptyState, ErrorState, LoadingState } from './PageState'
import './DailyBriefPage.css'

interface DailyBriefPageProps { data?: DailyBriefData; state?: 'ready' | 'loading' | 'error' }

export function DailyBriefPage({ data, state = 'ready' }: DailyBriefPageProps) {
  if (state === 'loading') return <div className="daily-brief"><LoadingState title="Composing your daily brief" description="Gathering your schedule, priorities, and system signals." /></div>
  if (state === 'error' || !data) return <div className="daily-brief"><ErrorState title="Daily brief unavailable" description="Your workspace is safe. Open each source directly while the brief reconnects." /></div>
  const generated = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(data.generatedAt))
  return <div className="daily-brief">
    <section className="brief-hero"><div><p className="eyebrow">Composed at {generated}</p><h1>{data.greeting}</h1><p className="subtitle">One calm view of what matters across LifeOS today.</p></div><a className="primary-button" href="#/today">Open today</a></section>
    <section className="brief-signal-grid" aria-label="Daily signals">{data.signals.map(signal => <article className={`brief-signal ${signal.status}`} key={signal.id}><span>{signal.label}</span><strong>{signal.value}</strong><p>{signal.detail}</p></article>)}</section>
    <div className="brief-layout">
      <section className="panel brief-priorities"><div className="panel-heading"><div><p className="eyebrow">Ranked for impact</p><h2>Next best actions</h2></div><span className="brief-count">{data.actions.length}</span></div>{data.actions.length ? <ol>{data.actions.map(action => <li key={action.id}><span className={`brief-rank ${action.priority}`}>{action.priority}</span><div><h3>{action.title}</h3><p>{action.reason}</p></div><a href={`#/${action.route}`} aria-label={`Open ${action.title}`}>Open →</a></li>)}</ol> : <EmptyState title="Nothing urgent" description="Your connected sources have no open priorities right now." />}</section>
      <aside className="panel brief-warnings"><div className="panel-heading"><div><p className="eyebrow">Exceptions</p><h2>Needs attention</h2></div></div>{data.warnings.length ? <ul>{data.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : <div className="brief-clear"><span aria-hidden="true">✓</span><strong>All clear</strong><p>No source warnings were found.</p></div>}</aside>
    </div>
  </div>
}
