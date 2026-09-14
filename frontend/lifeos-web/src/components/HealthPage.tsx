import { useState } from 'react'
import type { HealthData, HealthIcon } from '../models/health'
import { StatePanel } from './StatePanel'
import './HealthPage.css'
import { ProgressBar } from './visualizations/DataVisualizations'

type PageState = 'ready' | 'loading' | 'error'
interface IconProps { name: HealthIcon; size?: number }
interface HealthPageProps { data: HealthData; icon: (props: IconProps) => React.ReactNode; state?: PageState }

export function HealthPage({ data, icon: Icon, state = 'ready' }: HealthPageProps) {
  const [habits, setHabits] = useState(data.habits)
  const heading = <section className="health-hero"><div><p className="eyebrow">Wellbeing workspace · {data.dateLabel}</p><h1>Health</h1><p className="subtitle">A calm view of the routines that support your energy, recovery, and momentum.</p></div><div className="health-readiness"><span className="status-dot" />{data.readiness}</div></section>
  if (state === 'loading') return <div className="dashboard health-page">{heading}<StatePanel kind="loading" title="Loading your wellbeing workspace" description="Preparing today’s routines and progress." /></div>
  if (state === 'error') return <div className="dashboard health-page">{heading}<StatePanel kind="error" title="Unable to load health" description="Try again when your workspace connection is available." /></div>

  const completedHabits = habits.filter(habit => habit.completed).length
  return <div className="dashboard health-page">{heading}
    <section className="health-summary-grid">{data.summaries.map(summary => <article className="health-summary" key={summary.label}><div className={`card-icon ${summary.tone}`}><Icon name={summary.icon} /></div><p>{summary.label}</p><strong>{summary.value}</strong><span>{summary.detail}</span><ProgressBar label={summary.label} value={summary.progress} tone={summary.tone} /></article>)}</section>
    <section className="health-layout health-primary-layout">
      <article className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">Today’s rhythm</p><h2>Daily habits</h2></div><span className="health-count">{completedHabits}/{habits.length} complete</span></div><div className="health-habit-list">{habits.length ? habits.map(habit => <article className={`health-habit ${habit.completed ? 'completed' : ''}`} key={habit.id}><button className="health-check" aria-label={`${habit.completed ? 'Reopen' : 'Complete'} ${habit.title}`} onClick={() => setHabits(current => current.map(item => item.id === habit.id ? { ...item, completed: !item.completed } : item))}><Icon name="check" size={13} /></button><div className={`small-icon ${habit.tone}`}><Icon name={habit.icon} size={16} /></div><div><h3>{habit.title}</h3><p>{habit.detail}</p></div></article>) : <StatePanel kind="empty" title="No habits planned" description="Your daily wellbeing routines will appear here." />}</div></article>
      <article className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">Upcoming</p><h2>Reminders & appointments</h2></div><button className="text-button">View calendar <Icon name="arrow" size={16} /></button></div><div className="health-reminder-list">{data.reminders.length ? data.reminders.map(reminder => <article className="health-reminder" key={reminder.id}><div className={`small-icon ${reminder.tone}`}><Icon name={reminder.icon} size={16} /></div><div><h3>{reminder.title}<span>{reminder.kind}</span></h3><p>{reminder.detail}</p></div><time>{reminder.time}</time></article>) : <StatePanel kind="empty" title="Nothing upcoming" description="New reminders and appointments will appear here." />}</div></article>
    </section>
    <section className="health-layout">
      <article className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">Lightweight trends</p><h2>Progress this week</h2></div><button className="text-button">View insights <Icon name="arrow" size={16} /></button></div><div className="health-trend-list">{data.trends.map(trend => <article className="health-trend" key={trend.id}><div className="health-trend-top"><div><h3>{trend.label}</h3><p>{trend.detail}</p></div><strong>{trend.value}</strong></div><div className="health-progress"><i className={trend.tone} style={{ width: `${trend.progress}%` }} /></div></article>)}</div></article>
      <article className="panel health-panel"><div className="panel-heading"><div><p className="eyebrow">System log</p><h2>Recent activity</h2></div><button className="text-button">See all <Icon name="arrow" size={16} /></button></div><div className="health-activity-list">{data.activity.length ? data.activity.map(activity => <article className="health-activity" key={activity.id}><div className={`small-icon ${activity.tone}`}><Icon name={activity.icon} size={16} /></div><div><h3>{activity.title}</h3><p>{activity.description}</p></div><time>{activity.time}</time></article>) : <StatePanel kind="empty" title="No activity yet" description="Wellbeing activity will appear here as you log it." />}</div></article>
    </section>
  </div>
}
