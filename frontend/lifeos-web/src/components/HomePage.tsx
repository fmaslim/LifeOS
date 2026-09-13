import type { HomeData, HomeIcon } from '../models/home'
import { EmptyState, ErrorState, LoadingState } from './PageState'
import './HomePage.css'

type HomePageState = 'ready' | 'loading' | 'error'
interface IconProps { name: HomeIcon; size?: number }
interface HomePageProps { data: HomeData; icon: (props: IconProps) => React.ReactNode; state?: HomePageState }

export function HomePage({ data, icon: Icon, state = 'ready' }: HomePageProps) {
  const heading = <section className="home-hero"><div><p className="eyebrow">Property workspace</p><h1>{data.propertyName}</h1><p className="subtitle">{data.propertyDetail}</p></div><div className="home-period"><span className="status-dot" />{data.periodLabel}</div></section>
  if (state === 'loading') return <div className="dashboard home-page">{heading}<LoadingState title="Loading your home" description="Preparing your property and household snapshot." /></div>
  if (state === 'error') return <div className="dashboard home-page">{heading}<ErrorState title="Unable to load Home" description="Try again when your workspace connection is available." /></div>
  return <div className="dashboard home-page">{heading}
    <section className="home-metric-grid">{data.metrics.map(metric => <article className="home-metric" key={metric.label}><div className={`card-icon ${metric.tone}`}><Icon name={metric.icon} /></div><p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.detail}</span></article>)}</section>
    <section className="home-layout home-primary-layout">
      <article className="panel home-panel"><div className="panel-heading"><div><p className="eyebrow">Household</p><h2>Tenant & room occupancy</h2></div><button className="text-button">View household <Icon name="arrow" size={16} /></button></div><div className="occupancy-list">{data.occupancy.map(room => <article className="occupancy-row" key={room.id}><div className={`room-avatar ${room.tone}`}>{room.name.charAt(0)}</div><div><h3>{room.name}</h3><p>{room.occupant} · {room.detail}</p></div><span className={`occupancy-status ${room.status.toLowerCase().replace(' ', '-')}`}>{room.status}</span></article>)}</div></article>
      <article className="panel home-panel"><div className="panel-heading"><div><p className="eyebrow">Property health</p><h2>Home systems</h2></div><button className="text-button">View systems <Icon name="arrow" size={16} /></button></div><div className="system-status-list">{data.systems.map(system => <article className="home-system-row" key={system.id}><div className={`small-icon ${system.tone}`}><Icon name={system.icon} size={16} /></div><div><h3>{system.name}</h3><p>{system.detail}</p></div><span className={`system-status ${system.status.toLowerCase()}`}>{system.status}</span></article>)}</div></article>
    </section>
    <section className="home-layout">
      <article className="panel home-panel"><div className="panel-heading"><div><p className="eyebrow">Property care</p><h2>Maintenance & upcoming projects</h2></div><button className="text-button">View all <Icon name="arrow" size={16} /></button></div>{data.projects.length ? <div className="project-list">{data.projects.map(project => <article className="project-row" key={project.id}><div className={`small-icon ${project.tone}`}><Icon name={project.icon} size={16} /></div><div><h3>{project.title}</h3><p>{project.detail}</p></div><div><strong>{project.due}</strong><span className={`project-priority ${project.priority === 'Needs attention' ? 'urgent' : ''}`}>{project.priority}</span></div></article>)}</div> : <EmptyState title="No property work queued" description="Maintenance and projects will appear here when they are scheduled." />}</article>
      <article className="panel home-panel"><div className="panel-heading"><div><p className="eyebrow">Household log</p><h2>Recent activity</h2></div><button className="text-button">See all <Icon name="arrow" size={16} /></button></div>{data.activity.length ? <div className="home-activity-list">{data.activity.map(activity => <article className="home-activity-row" key={activity.id}><div className={`small-icon ${activity.tone}`}><Icon name={activity.icon} size={16} /></div><div><h3>{activity.title}</h3><p>{activity.description}</p></div><time>{activity.time}</time></article>)}</div> : <EmptyState title="No household activity yet" description="Updates from your household will appear here." />}</article>
    </section>
  </div>
}
