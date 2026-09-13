import { useEffect, useState } from 'react'
import './App.css'
import { AutomationsPage } from './components/AutomationsPage'
import { ContentGenerator } from './components/ContentGenerator'
import { PlaceholderPage } from './components/PlaceholderPage'
import type { DashboardIcon } from './models/dashboard'
import type { RouteName } from './models/shell'
import { MockDashboardService } from './services/MockDashboardService'
import { MockAutomationsService } from './services/MockAutomationsService'
import { MockShellService } from './services/MockShellService'

type IconName = DashboardIcon

const dashboardService = new MockDashboardService()
const dashboardData = dashboardService.getDashboardData()
const shellService = new MockShellService()
const shellData = shellService.getShellData()
const nav = shellData.navigation
const cards = [dashboardData.automationSummary, dashboardData.youtubePipelineSummary, dashboardData.jarvisSummary, dashboardData.docIQSummary, dashboardData.rentalIncomeSummary, dashboardData.systemHealthSummary]
const operations = dashboardData.dailyOperations
const activity = dashboardData.recentActivity
const automationsData = new MockAutomationsService().getAutomationsData()

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const p: Record<IconName, React.ReactNode> = { grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>, bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7z" />, play: <path d="m8 5 11 7-11 7z" />, sparkles: <><path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3z" /><path d="m5 17-.6 2.4L2 20l2.4.6L5 23l.6-2.4L8 20l-2.4-.6z" /></>, file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>, wallet: <><path d="M4 7a2 2 0 0 1 2-2h13v15H6a2 2 0 0 1-2-2z" /><path d="M4 8h14M16 14h.01" /></>, home: <><path d="m3 11 9-8 9 8v10H3z" /><path d="M9 21v-6h6v6" /></>, heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />, settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3.5h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>, arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>, more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>, check: <path d="m5 12 4 4L19 6" />, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></> }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>
}
function Sidebar({ activeRoute }: { activeRoute: RouteName }) { return <aside className="sidebar"><div className="brand"><span className="brand-mark">L</span>LifeOS</div><nav><p className="nav-caption">Workspace</p>{nav.map(n => <a className={`nav-link ${n.route === activeRoute ? 'active' : ''}`} href={`#/${n.route}`} key={n.route}><Icon name={n.icon} />{n.label}</a>)}</nav><div className="sidebar-footer"><span className="avatar">{shellData.profile.initials}</span><div><strong>{shellData.profile.name}</strong><small>{shellData.profile.workspaceName}</small></div><Icon name="more" size={18} /></div></aside> }
function SummaryCard({ card }: { card: typeof cards[number] }) { return <article className="summary-card"><div className={`card-icon ${card.tone}`}><Icon name={card.icon} /></div><p>{card.label}</p><strong>{card.value}</strong><span>{card.detail}</span></article> }
function App() {
  const readRoute = (): RouteName => {
    const route = window.location.hash.replace('#/', '') as RouteName
    return nav.some(item => item.route === route) ? route : 'dashboard'
  }
  const [route, setRoute] = useState<RouteName>(readRoute)
  useEffect(() => { const updateRoute = () => setRoute(readRoute()); window.addEventListener('hashchange', updateRoute); return () => window.removeEventListener('hashchange', updateRoute) }, [])
  const page = shellData.placeholderPages.find(item => item.route === route)
  const topbar = <header className="topbar"><div className="mobile-brand"><span className="brand-mark">L</span>LifeOS</div><div className="search"><Icon name="search" size={17} />Search your workspace <kbd>⌘ K</kbd></div><div className="header-actions"><button className="icon-button" aria-label="More options"><Icon name="more" /></button><span className="avatar">{shellData.profile.initials}</span></div></header>
  if (route === 'automations') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<AutomationsPage data={automationsData} icon={Icon} /></main></div>
  if (route === 'content') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<ContentGenerator /></main></div>
  if (route !== 'dashboard' && page) return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<PlaceholderPage page={page} icon={<Icon name={page.icon} size={27} />} /></main></div>
  return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<div className="dashboard"><section className="welcome"><div><p className="eyebrow">{dashboardData.currentDateLabel}</p><h1>LifeOS</h1><p className="subtitle">Your personal operating system</p></div><button className="primary-button">View all automations <Icon name="arrow" size={17} /></button></section><section className="summary-grid">{cards.map(c => <SummaryCard card={c} key={c.label} />)}</section><div className="content-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Focus for today</p><h2>Today's Operations</h2></div><button className="text-button">View all <Icon name="arrow" size={16} /></button></div><div className="operation-list">{operations.map((o, i) => <article className="operation" key={o.title}><button className="check-button" aria-label={`Complete ${o.title}`}><Icon name="check" size={14} /></button><div className={`small-icon ${o.tone}`}><Icon name={o.icon} size={18} /></div><div className="operation-copy"><h3>{o.title}</h3><p>{o.meta}</p></div><span className="operation-count">0{i + 1}</span></article>)}</div></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">System log</p><h2>Recent Activity</h2></div><button className="text-button">See all <Icon name="arrow" size={16} /></button></div><div className="activity-list">{activity.map(a => <article className="activity" key={a.title}><div className={`small-icon ${a.tone}`}><Icon name={a.icon} size={17} /></div><div><h3>{a.title}</h3><p>{a.description}</p></div><time><Icon name="clock" size={13} />{a.time}</time></article>)}</div><button className="activity-footer">Open activity center <Icon name="arrow" size={16} /></button></section></div></div></main></div>
}
export default App
