import { useMemo, useState } from 'react'
import type { Goal, GoalData, GoalStatus } from '../models/goal'
import { StatePanel } from './StatePanel'
import { storageKeys } from '../storage/storageKeys'
import { usePersistentState } from '../storage/usePersistentState'
import './GoalsPage.css'

type GoalsPageState = 'ready' | 'loading' | 'error'
type GoalFilter = 'all' | GoalStatus

const statusLabel: Record<GoalStatus, string> = { active: 'Active', completed: 'Completed', paused: 'Paused' }
const progressOf = (goal: Goal) => Math.round((goal.milestones.filter(milestone => milestone.completed).length / goal.milestones.length) * 100)
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00`))

export function GoalsPage({ data, state = 'ready' }: { data: GoalData; state?: GoalsPageState }) {
  const [goals, setGoals] = usePersistentState(storageKeys.goals, data.goals)
  const [filter, setFilter] = useState<GoalFilter>('all')
  const filteredGoals = useMemo(() => goals.filter(goal => filter === 'all' || goal.status === filter), [filter, goals])
  const activeGoals = goals.filter(goal => goal.status === 'active')
  const averageProgress = activeGoals.length ? Math.round(activeGoals.reduce((total, goal) => total + progressOf(goal), 0) / activeGoals.length) : 0
  const milestoneTotal = activeGoals.reduce((total, goal) => total + goal.milestones.length, 0)
  const milestoneComplete = activeGoals.reduce((total, goal) => total + goal.milestones.filter(milestone => milestone.completed).length, 0)
  const toggleMilestone = (goalId: string, milestoneId: string) => setGoals(current => current.map(goal => goal.id !== goalId ? goal : { ...goal, milestones: goal.milestones.map(milestone => milestone.id === milestoneId ? { ...milestone, completed: !milestone.completed } : milestone) }))
  const hero = <section className="goals-hero"><div><p className="eyebrow">Direction & momentum</p><h1>Goals</h1><p className="subtitle">Keep the outcomes that matter visible, measurable, and moving.</p></div><div className="goals-hero-note"><span>Focus horizon</span><strong>2026–27</strong></div></section>
  if (state === 'loading') return <div className="dashboard goals-page">{hero}<StatePanel kind="loading" title="Loading goals" description="Preparing your long-range view." /></div>
  if (state === 'error') return <div className="dashboard goals-page">{hero}<StatePanel kind="error" title="Unable to load goals" description="Try again when your workspace is available." /></div>
  return <div className="dashboard goals-page">{hero}
    <section className="goals-summary" aria-label="Goal progress summary"><article><span>{activeGoals.length}</span><p>active goals</p></article><article><span>{averageProgress}%</span><p>average progress</p></article><article><span>{milestoneComplete}/{milestoneTotal}</span><p>active milestones done</p></article></section>
    <section className="panel goals-panel"><div className="goals-toolbar"><div><p className="eyebrow">Your goals</p><h2>Long-range view <span>{filteredGoals.length}</span></h2></div><div className="goal-filters" aria-label="Goal status filters">{(['all', 'active', 'completed', 'paused'] as GoalFilter[]).map(value => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : statusLabel[value]}</button>)}</div></div>
      <div className="goal-grid">{filteredGoals.length ? filteredGoals.map(goal => { const progress = progressOf(goal); const complete = goal.milestones.filter(milestone => milestone.completed).length; return <article className={`goal-card goal-${goal.status}`} key={goal.id}><div className="goal-card-top"><span className={`goal-area ${goal.area.toLowerCase()}`}>{goal.area}</span><span className={`goal-status ${goal.status}`}>{statusLabel[goal.status]}</span></div><h3>{goal.title}</h3><p className="goal-description">{goal.description}</p><div className="goal-progress"><div><strong>{progress}%</strong><span>{complete} of {goal.milestones.length} milestones</span></div><div className="goal-track" aria-label={`${progress}% complete`}><span style={{ width: `${progress}%` }} /></div></div><div className="milestone-list">{goal.milestones.map(milestone => <button className={`milestone ${milestone.completed ? 'done' : ''}`} key={milestone.id} onClick={() => toggleMilestone(goal.id, milestone.id)} disabled={goal.status === 'completed'} aria-pressed={milestone.completed}><span aria-hidden="true">✓</span>{milestone.title}</button>)}</div><footer><span>Target {dateLabel(goal.targetDate)}</span>{goal.status === 'paused' && <span>On hold</span>}</footer></article> }) : <StatePanel kind="empty" title="No goals in this view" description="Choose another status to see your goal workspace." />}</div>
    </section>
  </div>
}
