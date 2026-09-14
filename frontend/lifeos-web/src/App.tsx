import { useEffect, useState } from 'react'
import './App.css'
import { AutomationsPage } from './components/AutomationsPage'
import { JarvisPage } from './components/JarvisPage'
import { EmptyState } from './components/PageState'
import { ContentPage } from './components/ContentPage'
import { PlaceholderPage } from './components/PlaceholderPage'
import { DocIQPage } from './components/DocIQPage'
import { FinancesPage } from './components/FinancesPage'
import { HomePage } from './components/HomePage'
import type { DashboardIcon } from './models/dashboard'
import type { RouteName } from './models/shell'
import { HealthPage } from './components/HealthPage'
import { SettingsPage } from './components/SettingsPage'
import { TodayPage } from './components/TodayPage'
import { TasksPage } from './components/TasksPage'
import { GoalsPage } from './components/GoalsPage'
import { CalendarPage } from './components/CalendarPage'
import { NotesPage } from './components/NotesPage'
import { CommandPalette } from './components/CommandPalette'
import { ActivityPage } from './components/ActivityPage'
import { NotificationCenter } from './components/NotificationCenter'
import { createServiceRegistry } from './services/serviceRegistry'
import { storageKeys } from './storage/storageKeys'
import { usePersistentState } from './storage/usePersistentState'
import { ProjectsPage } from './components/ProjectsPage'
import { HabitsPage } from './components/HabitsPage'
import { LearningPage } from './components/LearningPage'
import { ContactsPage } from './components/ContactsPage'
import { ReadingPage } from './components/ReadingPage'
import { DocumentsPage } from './components/DocumentsPage'
import { BudgetPage } from './components/BudgetPage'
import { PropertyPage } from './components/PropertyPage'

type IconName = DashboardIcon

const services = createServiceRegistry()
const dashboardData = services.dashboard.getDashboardData()
const shellData = services.shell.getShellData()
const docIQData = services.docIQ.getDocIQData()
const automationsData = services.automations.getAutomationsData()
const jarvisData = services.jarvis.getJarvisData()
const contentService = services.content
const financesData = services.finances.getFinancesData()
const homeData = services.home.getHomeData()
const healthData = services.health.getHealthData()
const settingsData = services.settings.getSettingsData()
const todayData = services.today.getTodayData()
const taskData = services.tasks.getTaskData()
const goalData = services.goals.getGoalData()
const calendarData = services.calendar.getCalendarData()
const noteData = services.notes.getNoteData()
const searchService = services.search
const activityData = services.activity.getActivityData()
const notificationData = services.notifications.getNotificationData()
const projectData = services.projects.getProjectData()
const habitData = services.habits.getHabitData()
const learningData = services.learning.getLearningData()
const contactData = services.contacts.getContactData()
const readingData = services.reading.getReadingData()
const documentData = services.documents.getDocumentData()
const budgetData = services.budget.getBudgetData()
const propertyData = services.property.getPropertyData()
const nav = shellData.navigation
const cards = [dashboardData.automationSummary, dashboardData.youtubePipelineSummary, dashboardData.jarvisSummary, dashboardData.docIQSummary, dashboardData.rentalIncomeSummary, dashboardData.systemHealthSummary]
const operations = dashboardData.dailyOperations
const activity = dashboardData.recentActivity

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  if (name === 'calendar') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>
  // @ts-ignore The shared registry falls back to the file glyph for page-specific icons.
  const p: Record<IconName, React.ReactNode> = { grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>, bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7z" />, play: <path d="m8 5 11 7-11 7z" />, sparkles: <><path d="m12 3-1.3 5.7L5 10l5.7 1.3L12 17l1.3-5.7L19 10l-5.7-1.3z" /><path d="m5 17-.6 2.4L2 20l2.4.6L5 23l.6-2.4L8 20l-2.4-.6z" /></>, file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>, files: <><path d="M8 3h8l4 4v13H8z" /><path d="M16 3v5h5M4 7v14h12M11 13h5M11 17h5" /></>, scan: <><path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" /><rect x="8" y="8" width="8" height="8" rx="1" /></>, alert: <><path d="M12 3 2.8 20h18.4z" /><path d="M12 9v5M12 17h.01" /></>, review: <><path d="M5 3h11l3 3v15H5z" /><path d="M16 3v4h4M9 13l2 2 4-4" /></>, folder: <path d="M3 6.5h7l2 2h9v10.5H3z" />, upload: <><path d="M12 16V4M8 8l4-4 4 4M5 15v5h14v-5" /></>, wallet: <><path d="M4 7a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2-2z" /></>, home: <><path d="m3 11 9-8 9 8v10H3z" /><path d="M9 21v-6h6v6" /></>, heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />, settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H5v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3.5h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>, arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>, more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>, check: <path d="m5 12 4 4L19 6" />, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>, target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2" /></>, chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>, refresh: <path d="M20 11a8 8 0 1 0 1 5M20 4v7h-7" />, chevron: <path d="m9 18 6-6-6-6" />, users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a3 3 0 1 0-1.3-5.7M18 14c1.8.6 3 2.3 3 4.3" /></>, send: <path d="m21 3-8 18-3.5-7.5L2 10zM9.5 13.5 15 9" />, mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>
}
function Sidebar({ activeRoute }: { activeRoute: RouteName }) { return <aside className="sidebar"><div className="brand"><span className="brand-mark">L</span>LifeOS</div><nav><p className="nav-caption">Workspace</p>{nav.map(n => <a className={`nav-link ${n.route === activeRoute ? 'active' : ''}`} href={`#/${n.route}`} key={n.route}><Icon name={n.icon} />{n.label}</a>)}</nav><div className="sidebar-footer"><span className="avatar">{shellData.profile.initials}</span><div><strong>{shellData.profile.name}</strong><small>{shellData.profile.workspaceName}</small></div><Icon name="more" size={18} /></div></aside> }
function SummaryCard({ card }: { card: typeof cards[number] }) { return <article className="summary-card"><div className={`card-icon ${card.tone}`}><Icon name={card.icon} /></div><p>{card.label}</p><strong>{card.value}</strong><span>{card.detail}</span></article> }
function App() {
  const readRoute = (): RouteName => {
    const route = window.location.hash.replace('#/', '').split('?')[0] as RouteName
    return nav.some(item => item.route === route) ? route : 'dashboard'
  }
  const [route, setRoute] = useState<RouteName>(readRoute)
  const [activeOperations, setActiveOperations] = usePersistentState(storageKeys.dashboardOperations, operations)
  useEffect(() => { const updateRoute = () => setRoute(readRoute()); window.addEventListener('hashchange', updateRoute); return () => window.removeEventListener('hashchange', updateRoute) }, [])
  const page = shellData.placeholderPages.find(item => item.route === route)
  const topbar = <header className="topbar"><div className="mobile-brand"><span className="brand-mark">L</span>LifeOS</div><CommandPalette navigation={nav} searchService={searchService} /><div className="header-actions"><NotificationCenter data={notificationData} /><button className="icon-button" aria-label="More options"><Icon name="more" /></button><span className="avatar">{shellData.profile.initials}</span></div></header>
  if ((route as RouteName) === 'automations') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<AutomationsPage data={automationsData} icon={Icon} /></main></div>
  if (route === 'automations') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<AutomationsPage data={automationsData} icon={Icon} /></main></div>
  if (route === 'jarvis') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<JarvisPage data={jarvisData} icon={Icon} /></main></div>
  if (route === 'dociq') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<DocIQPage data={docIQData} icon={name => <Icon name={name} size={18} />} /></main></div>
  if (route === 'finances') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<FinancesPage data={financesData} icon={({ name, size }) => <Icon name={name} size={size ?? 18} />} /></main></div>
  if (route === 'home') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<HomePage data={homeData} icon={({ name, size }) => <Icon name={name} size={size ?? 18} />} /></main></div>
  if (route === 'health') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<HealthPage data={healthData} icon={({ name, size }) => <Icon name={name} size={size ?? 18} />} /></main></div>
  if (route === 'today') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<TodayPage data={todayData} icon={({ name, size }) => <Icon name={name} size={size ?? 18} />} /></main></div>
  if (route === 'calendar') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<CalendarPage data={calendarData} /></main></div>
  if (route === 'activity') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<ActivityPage data={activityData} /></main></div>
  if (route === 'projects') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<ProjectsPage data={projectData} /></main></div>
  if (route === 'habits') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<HabitsPage data={habitData} /></main></div>
  if (route === 'learning') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<LearningPage data={learningData} /></main></div>
  if (route === 'contacts') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<ContactsPage data={contactData} /></main></div>
  if (route === 'reading') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<ReadingPage data={readingData} /></main></div>
  if (route === 'documents') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<DocumentsPage data={documentData} /></main></div>
  if (route === 'budget') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<BudgetPage data={budgetData} /></main></div>
  if (route === 'property') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<PropertyPage data={propertyData} /></main></div>
  if (route === 'notes') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<NotesPage data={noteData} /></main></div>
  if (route === 'tasks') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<TasksPage tasks={taskData.tasks} /></main></div>
  if (route === 'goals') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<GoalsPage data={goalData} /></main></div>
  if (route === 'settings') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<SettingsPage data={settingsData} icon={({ name, size }) => <Icon name={name} size={size ?? 18} />} /></main></div>
  if (route === 'content') return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<ContentPage contentService={contentService} /></main></div>
  if (route !== 'dashboard' && page) return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<PlaceholderPage page={page} icon={<Icon name={page.icon} size={27} />} /></main></div>
  return <div className="app-shell"><Sidebar activeRoute={route} /><main className="main-content">{topbar}<div className="dashboard"><section className="welcome"><div><p className="eyebrow">{dashboardData.currentDateLabel}</p><h1>LifeOS</h1><p className="subtitle">Your personal operating system</p></div><button className="primary-button">View all automations <Icon name="arrow" size={17} /></button></section><section className="summary-grid">{cards.map(c => <SummaryCard card={c} key={c.label} />)}</section><div className="content-grid"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Focus for today</p><h2>Today's Operations</h2></div><button className="text-button">View all <Icon name="arrow" size={16} /></button></div>{activeOperations.length ? <div className="operation-list">{activeOperations.map((o, i) => <article className="operation" key={o.title}><button className="check-button" aria-label={`Complete ${o.title}`} onClick={() => setActiveOperations(current => current.filter(item => item.title !== o.title))}><Icon name="check" size={14} /></button><div className={`small-icon ${o.tone}`}><Icon name={o.icon} size={18} /></div><div className="operation-copy"><h3>{o.title}</h3><p>{o.meta}</p></div><span className="operation-count">0{i + 1}</span></article>)}</div> : <EmptyState title="You're all caught up" description="Today's operations are complete. New priorities will appear here as they are scheduled." action={{ label: 'Restore today\'s list', onClick: () => setActiveOperations(operations) }} />}</section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">System log</p><h2>Recent Activity</h2></div><button className="text-button">See all <Icon name="arrow" size={16} /></button></div><div className="activity-list">{activity.map(a => <article className="activity" key={a.title}><div className={`small-icon ${a.tone}`}><Icon name={a.icon} size={17} /></div><div><h3>{a.title}</h3><p>{a.description}</p></div><time><Icon name="clock" size={13} />{a.time}</time></article>)}</div><button className="activity-footer">Open activity center <Icon name="arrow" size={16} /></button></section></div></div></main></div>
}
export default App
