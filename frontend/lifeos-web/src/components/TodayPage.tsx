import { useState } from 'react'
import type { TodayData, TodayIcon } from '../models/today'
import { StatePanel } from './StatePanel'
import './TodayPage.css'

type TodayPageState = 'ready' | 'loading' | 'error'
interface IconProps { name: TodayIcon; size?: number }
interface TodayPageProps { data: TodayData; icon: (props: IconProps) => React.ReactNode; state?: TodayPageState }

export function TodayPage({ data, icon: Icon, state = 'ready' }: TodayPageProps) {
  const [tasks, setTasks] = useState(data.tasks)
  const [snoozedTasks, setSnoozedTasks] = useState<string[]>([])
  const [openedSource, setOpenedSource] = useState<string | null>(null)
  const openSource = (source: string) => setOpenedSource(source)
  const visibleTasks = tasks.filter(task => !snoozedTasks.includes(task.id))
  const completedCount = data.tasks.length - tasks.length
  const heading = <section className="today-hero"><div><p className="eyebrow">Your day · {data.dateLabel}</p><h1>{data.greeting}</h1><p className="subtitle">{data.summary}</p></div><div className="today-focus"><span className="status-dot" />{data.focusLabel}</div></section>

  if (state === 'loading') return <div className="dashboard today-page">{heading}<StatePanel kind="loading" title="Loading your day" description="Preparing today’s priorities and schedule." /></div>
  if (state === 'error') return <div className="dashboard today-page">{heading}<StatePanel kind="error" title="Unable to load Today" description="Try again when your workspace connection is available." /></div>

  return <div className="dashboard today-page">{heading}
    {openedSource && <div className="today-source-notice" role="status"><span>Source opened</span><strong>{openedSource}</strong><button onClick={() => setOpenedSource(null)} aria-label="Dismiss source notice">×</button></div>}
    <section className="today-priority-panel"><div className="today-section-heading"><div><p className="eyebrow">Focus mode</p><h2>Top 3 priorities</h2></div><span>{completedCount} completed today</span></div><div className="today-priority-grid">{data.priorities.map((priority, index) => <article className="today-priority" key={priority.id}><div className="today-priority-top"><span className="today-priority-number">0{index + 1}</span><div className={`small-icon ${priority.tone}`}><Icon name={priority.icon} size={16} /></div></div><h3>{priority.title}</h3><p>{priority.detail}</p><button className="today-source-button" onClick={() => openSource(priority.source)}>Open source <Icon name="arrow" size={14} /></button></article>)}</div></section>
    <section className="today-layout today-primary-layout">
      <article className="panel today-panel"><div className="panel-heading"><div><p className="eyebrow">Action queue</p><h2>Today’s tasks</h2></div><span className="today-count">{visibleTasks.length} active</span></div><div className="today-task-list">{visibleTasks.length ? visibleTasks.map(task => <article className="today-task" key={task.id}><button className="today-check" aria-label={`Complete ${task.title}`} onClick={() => setTasks(current => current.filter(item => item.id !== task.id))}><Icon name="check" size={13} /></button><div className={`small-icon ${task.tone}`}><Icon name={task.icon} size={16} /></div><div className="today-task-copy"><h3>{task.title}</h3><p>{task.detail}</p><button onClick={() => openSource(task.source)}>{task.source}</button></div><div className="today-task-actions"><time>{task.due}</time><button className="today-snooze-button" onClick={() => setSnoozedTasks(current => [...current, task.id])}>Snooze</button></div></article>) : <StatePanel kind="empty" title="Your task list is clear" description="Completed and snoozed tasks stay out of your focus queue." />}</div>{snoozedTasks.length > 0 && <button className="today-restore-button" onClick={() => setSnoozedTasks([])}>Restore {snoozedTasks.length} snoozed task{snoozedTasks.length === 1 ? '' : 's'}</button>}</article>
      <article className="panel today-panel"><div className="panel-heading"><div><p className="eyebrow">Time blocked</p><h2>Scheduled today</h2></div><button className="text-button" onClick={() => openSource('Calendar')}>Open calendar <Icon name="arrow" size={16} /></button></div><div className="today-schedule-list">{data.schedule.length ? data.schedule.map(item => <article className="today-schedule" key={item.id}><time>{item.time}</time><i className={item.tone} /><div><h3>{item.title}</h3><p>{item.detail}</p><button onClick={() => openSource(item.source)}>{item.source}</button></div></article>) : <StatePanel kind="empty" title="No scheduled items" description="Time blocks and appointments will appear here." />}</div></article>
    </section>
    <section className="today-layout">
      <article className="panel today-panel"><div className="panel-heading"><div><p className="eyebrow">Keep in view</p><h2>Reminders</h2></div><button className="text-button" onClick={() => openSource('Reminders')}>View all <Icon name="arrow" size={16} /></button></div><div className="today-reminder-list">{data.reminders.length ? data.reminders.map(reminder => <article className="today-reminder" key={reminder.id}><div className={`small-icon ${reminder.tone}`}><Icon name={reminder.icon} size={16} /></div><div><h3>{reminder.title}</h3><p>{reminder.detail}</p><button onClick={() => openSource(reminder.source)}>{reminder.source}</button></div></article>) : <StatePanel kind="empty" title="No reminders" description="Nothing else needs your attention right now." />}</div></article>
      <article className="panel today-panel"><div className="panel-heading"><div><p className="eyebrow">Cross-workspace</p><h2>Important signals</h2></div><button className="text-button" onClick={() => openSource('Activity center')}>Open activity <Icon name="arrow" size={16} /></button></div><div className="today-signal-list">{data.signals.length ? data.signals.map(signal => <article className="today-signal" key={signal.id}><div className={`small-icon ${signal.tone}`}><Icon name={signal.icon} size={16} /></div><div><span className={`today-severity ${signal.severity.toLowerCase()}`}>{signal.label} · {signal.severity}</span><h3>{signal.title}</h3><p>{signal.detail}</p><button onClick={() => openSource(signal.source)}>{signal.source}</button></div></article>) : <StatePanel kind="empty" title="All quiet" description="Important updates from your workspaces will appear here." />}</div></article>
    </section>
  </div>
}
