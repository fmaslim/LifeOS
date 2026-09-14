import type { DashboardIcon } from '../models/dashboard'
import type { JarvisData } from '../models/jarvis'
import './JarvisPage.css'
import './JarvisProvider.css'
import { StatePanel } from './StatePanel'

interface JarvisPageProps {
  data: JarvisData
  icon: React.ComponentType<{ name: DashboardIcon; size?: number }>
}

export function JarvisPage({ data, icon: Icon }: JarvisPageProps) {
  return <div className="dashboard jarvis-page">
    <section className="jarvis-welcome">
      <div>
        <p className="eyebrow">Intelligence layer</p>
        <h1>Jarvis</h1>
        <p className="subtitle">Your prospecting and outreach command center.</p>
      </div>
      <button className="primary-button">Run prospecting <Icon name="refresh" size={16} /></button>
    </section>

    <section className="jarvis-status" aria-label="Jarvis prospecting status">
      <div className="jarvis-status-mark"><Icon name="sparkles" size={21} /></div>
      <div className="jarvis-status-copy"><span className={`status-label connection-${data.connection}`}><i />{data.providerName} · {data.connection}</span><strong>{data.statusDetail}</strong></div>
      <div className="run-time"><span>Last run</span><strong>{data.lastRun}</strong></div>
      <div className="run-time"><span>Next run</span><strong>{data.nextRun}</strong></div>
      <button className="text-button">View run history <Icon name="arrow" size={16} /></button>
    </section>

    {data.connection === 'unavailable' && <StatePanel kind="error" title="Jarvis provider unavailable" description="Prospecting data could not be refreshed. Other LifeOS workspaces are unaffected." />}
    <section className="jarvis-metrics">{data.metrics.map(metric => <article className="jarvis-metric" key={metric.label}>
      <div className={`card-icon ${metric.tone}`}><Icon name={metric.icon} /></div><p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.detail}</span>
    </article>)}</section>

    <div className="jarvis-content-grid">
      <section className="panel jarvis-panel"><div className="panel-heading"><div><p className="eyebrow">Ready to connect</p><h2>Qualified Prospects</h2></div><button className="text-button">View all <Icon name="arrow" size={16} /></button></div>
        <div className="prospect-list">{data.qualifiedProspects.map(prospect => <article className="prospect" key={prospect.name}><span className="prospect-avatar">{prospect.initials}</span><div className="prospect-copy"><h3>{prospect.name}</h3><p>{prospect.role} · {prospect.company}</p></div><div className="prospect-score"><strong>{prospect.score}</strong><span>{prospect.scoreLabel}</span></div></article>)}</div>
      </section>
      <section className="panel jarvis-panel"><div className="panel-heading"><div><p className="eyebrow">Today</p><h2>Outreach Queue</h2></div><button className="text-button">Open queue <Icon name="arrow" size={16} /></button></div>
        <div className="queue-list">{data.outreachQueue.map(item => <article className="queue-item" key={item.name}><span className="prospect-avatar queue-avatar">{item.initials}</span><div className="prospect-copy"><h3>{item.name}</h3><p>{item.company}</p></div><div className="queue-meta"><span>{item.status}</span><strong>{item.scheduledFor}</strong></div></article>)}</div>
      </section>
    </div>

    <section className="panel jarvis-panel jarvis-activity"><div className="panel-heading"><div><p className="eyebrow">System log</p><h2>Recent Jarvis Activity</h2></div><button className="text-button">See all <Icon name="arrow" size={16} /></button></div>
      <div className="jarvis-activity-list">{data.activity.map(item => <article className="jarvis-activity-item" key={item.title}><span className={`activity-dot ${item.tone}`} /><div><h3>{item.title}</h3><p>{item.detail}</p></div><time>{item.time}</time></article>)}</div>
    </section>
  </div>
}
