import { useEffect, useMemo, useState } from 'react'
import type { AutomationsData } from '../models/automation'
import type { HabitData } from '../models/habit'
import type { RoutineDefinition, RoutineInstance, RoutineKind, RoutineStepDefinition, RoutineStepIntegration } from '../models/routine'
import type { TaskData } from '../models/task'
import type { RoutineService } from '../services/RoutineService'
import './WorkspaceCollection.css'
import './RoutinesPage.css'

interface RoutinesPageProps { service: RoutineService; tasks: TaskData; habits: HabitData; automations: AutomationsData }

const kinds: RoutineKind[] = ['morning', 'evening', 'weekly', 'household', 'content', 'custom']
const kindLabel: Record<RoutineKind, string> = { morning: 'Morning', evening: 'Evening', weekly: 'Weekly', household: 'Household', content: 'Content', custom: 'Custom' }
const statusLabel: Record<RoutineInstance['status'], string> = { scheduled: 'Scheduled', 'in-progress': 'In progress', completed: 'Completed', partial: 'Partial', missed: 'Missed' }
const integrations: RoutineStepIntegration[] = ['manual', 'task', 'habit', 'automation']
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const today = () => new Date().toISOString().slice(0, 10)

function cadenceSummary(routine: RoutineDefinition) {
  if (routine.cadence.type === 'daily') return 'Every day'
  if (routine.cadence.type === 'weekly') return routine.cadence.weekdays.length ? `Weekly · ${routine.cadence.weekdays.map(day => weekdayNames[day]).join(', ')}` : 'Weekly'
  return `Every ${routine.cadence.intervalDays} days`
}

function blankStep(id: string): RoutineStepDefinition { return { id, title: '', integration: 'manual' } }

function StepEditor({ step, tasks, habits, automations, onChange, onRemove }: { step: RoutineStepDefinition; tasks: TaskData; habits: HabitData; automations: AutomationsData; onChange: (step: RoutineStepDefinition) => void; onRemove: () => void }) {
  const allAutomations = [...automations.active, ...automations.scheduled, ...automations.completed, ...automations.failed, ...automations.blocked]
  return <article className="routine-step-editor">
    <input aria-label="Step title" placeholder="Step title" value={step.title} onChange={event => onChange({ ...step, title: event.target.value })} />
    <select aria-label="Step integration" value={step.integration} onChange={event => onChange({ ...step, integration: event.target.value as RoutineStepIntegration, taskId: undefined, habitId: undefined, automationId: undefined })}>
      {integrations.map(integration => <option key={integration} value={integration}>{integration}</option>)}
    </select>
    {step.integration === 'task' && <select aria-label="Linked task" value={step.taskId ?? ''} onChange={event => onChange({ ...step, taskId: event.target.value || undefined })}>
      <option value="">New task from this step</option>
      {tasks.tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}
    </select>}
    {step.integration === 'habit' && <select aria-label="Linked habit" value={step.habitId ?? ''} onChange={event => onChange({ ...step, habitId: event.target.value || undefined })}>
      <option value="">Select a habit…</option>
      {habits.habits.map(habit => <option key={habit.id} value={habit.id}>{habit.title}</option>)}
    </select>}
    {step.integration === 'automation' && <select aria-label="Linked automation" value={step.automationId ?? ''} onChange={event => onChange({ ...step, automationId: event.target.value || undefined, automationAction: 'run' })}>
      <option value="">Select an automation…</option>
      {allAutomations.map(automation => <option key={automation.id} value={automation.id}>{automation.name}</option>)}
    </select>}
    <button type="button" onClick={onRemove} aria-label={`Remove step ${step.title || ''}`}>×</button>
  </article>
}

function NewRoutineForm({ tasks, habits, automations, onCreate, onCancel }: { tasks: TaskData; habits: HabitData; automations: AutomationsData; onCreate: (routine: Omit<RoutineDefinition, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<RoutineKind>('custom')
  const [description, setDescription] = useState('')
  const [cadenceType, setCadenceType] = useState<'daily' | 'weekly' | 'custom'>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([1])
  const [intervalDays, setIntervalDays] = useState(7)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [steps, setSteps] = useState<RoutineStepDefinition[]>([blankStep('step-1')])

  const toggleWeekday = (day: number) => setWeekdays(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day].sort())
  const updateStep = (index: number, step: RoutineStepDefinition) => setSteps(current => current.map((item, itemIndex) => itemIndex === index ? step : item))
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !steps.some(step => step.title.trim())) return
    const cadence = cadenceType === 'daily' ? { type: 'daily' as const } : cadenceType === 'weekly' ? { type: 'weekly' as const, weekdays: weekdays.length ? weekdays : [1] } : { type: 'custom' as const, intervalDays: Math.max(2, intervalDays), anchorDate: today() }
    const preparedSteps = steps.filter(step => step.title.trim()).map(step => step.integration === 'task' && !step.taskId ? { ...step, taskTemplate: { title: step.title.trim(), domain: 'Personal' as const, priority: 'medium' as const } } : step)
    onCreate({ name: name.trim(), kind, description: description.trim(), cadence, timeWindow: start && end ? { start, end } : undefined, enabled: true, steps: preparedSteps })
  }

  return <form className="panel routine-form" onSubmit={submit}>
    <div className="panel-heading"><div><p className="eyebrow">Custom routine</p><h2>New routine</h2></div><button type="button" className="text-button" onClick={onCancel}>Cancel</button></div>
    <label>Name<input value={name} onChange={event => setName(event.target.value)} required /></label>
    <div className="routine-form-grid">
      <label>Kind<select value={kind} onChange={event => setKind(event.target.value as RoutineKind)}>{kinds.map(item => <option key={item} value={item}>{kindLabel[item]}</option>)}</select></label>
      <label>Cadence<select value={cadenceType} onChange={event => setCadenceType(event.target.value as typeof cadenceType)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="custom">Every N days</option></select></label>
    </div>
    {cadenceType === 'weekly' && <div className="routine-weekdays" role="group" aria-label="Weekdays">{weekdayNames.map((label, day) => <label key={label}><input type="checkbox" checked={weekdays.includes(day)} onChange={() => toggleWeekday(day)} />{label}</label>)}</div>}
    {cadenceType === 'custom' && <label>Repeat every (days)<input type="number" min={2} value={intervalDays} onChange={event => setIntervalDays(Number(event.target.value) || 2)} /></label>}
    <div className="routine-form-grid">
      <label>Window start<input type="time" value={start} onChange={event => setStart(event.target.value)} /></label>
      <label>Window end<input type="time" value={end} onChange={event => setEnd(event.target.value)} /></label>
    </div>
    <label>Description<input value={description} onChange={event => setDescription(event.target.value)} /></label>
    <p className="eyebrow">Steps</p>
    <div className="routine-step-list">{steps.map((step, index) => <StepEditor key={step.id} step={step} tasks={tasks} habits={habits} automations={automations} onChange={next => updateStep(index, next)} onRemove={() => setSteps(current => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)} />)}</div>
    <button type="button" className="workspace-link" onClick={() => setSteps(current => [...current, blankStep(`step-${current.length + 1}-${Date.now()}`)])}>+ Add step</button>
    <button className="primary-button" type="submit">Create routine</button>
  </form>
}

function StepRow({ instance, step, onComplete, onSkip }: { instance: RoutineInstance; step: RoutineInstance['steps'][number]; onComplete: () => void; onSkip: () => void }) {
  return <li className={`routine-step routine-step-${step.status}`}>
    <span className="routine-step-title">{step.title}<small>{step.integration}</small></span>
    {step.status === 'pending' && <span className="routine-step-actions"><button onClick={onComplete}>Complete</button><button onClick={onSkip}>Skip</button></span>}
    {step.status === 'awaiting-approval' && <a className="routine-step-approval" href="#/approvals">Awaiting approval →</a>}
    {(step.status === 'done' || step.status === 'skipped') && <span className="routine-step-done">{step.status === 'done' ? '✓ Done' : 'Skipped'}</span>}
    {instance.status === 'missed' && step.status === 'pending' && <span className="routine-step-missed">Missed</span>}
  </li>
}

export function RoutinesPage({ service, tasks, habits, automations }: RoutinesPageProps) {
  const [version, setVersion] = useState(0)
  const [kindFilter, setKindFilter] = useState<RoutineKind | 'all'>('all')
  const [historyRoutineId, setHistoryRoutineId] = useState<'all' | string>('all')
  const [showForm, setShowForm] = useState(false)
  const refresh = () => setVersion(value => value + 1)

  useEffect(() => { service.ensureScheduledInstances(); refresh() }, [service])

  const routines = useMemo(() => service.listRoutines(), [service, version])
  const visibleRoutines = useMemo(() => routines.filter(routine => kindFilter === 'all' || routine.kind === kindFilter), [routines, kindFilter])
  const todayInstances = useMemo(() => service.listInstances({ date: today() }), [service, version])
  const history = useMemo(() => service.listInstances(historyRoutineId === 'all' ? {} : { routineId: historyRoutineId }), [service, version, historyRoutineId])
  const completedToday = todayInstances.filter(instance => instance.status === 'completed').length
  const missedToday = todayInstances.filter(instance => instance.status === 'missed').length

  return <div className="dashboard routines-page">
    <section className="workspace-hero">
      <div><p className="eyebrow">Structured, repeatable workflows</p><h1>Routines</h1><p className="subtitle">{todayInstances.length ? `${completedToday} of ${todayInstances.length} routines complete today${missedToday ? ` · ${missedToday} missed` : ''}.` : 'No routines are due today.'}</p></div>
      <button className="primary-button" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close' : '+ New routine'}</button>
    </section>

    {showForm && <NewRoutineForm tasks={tasks} habits={habits} automations={automations} onCancel={() => setShowForm(false)} onCreate={routine => { service.createRoutine(routine); setShowForm(false); refresh() }} />}

    <section className="panel routines-today">
      <div className="panel-heading"><div><p className="eyebrow">Today</p><h2>Today's instances</h2></div></div>
      {todayInstances.length ? <div className="routine-instance-list">{todayInstances.map(instance => <article className={`routine-instance routine-instance-${instance.status}`} key={instance.id}>
        <header><div><span className="workspace-pill">{kindLabel[instance.kind]}</span><h3>{instance.routineName}</h3></div><span className={`routine-status routine-status-${instance.status}`}>{statusLabel[instance.status]}</span></header>
        {instance.status === 'scheduled' && <button className="text-button" onClick={() => { service.startInstance(instance.id); refresh() }}>Start routine</button>}
        <ul className="routine-step-checklist">{instance.steps.map(step => <StepRow key={step.stepId} instance={instance} step={step} onComplete={() => { service.completeStep(instance.id, step.stepId); refresh() }} onSkip={() => { service.skipStep(instance.id, step.stepId); refresh() }} />)}</ul>
      </article>)}</div> : <p className="routines-empty">Nothing scheduled for today. Enable a routine below or create a custom one.</p>}
    </section>

    <section className="panel routines-list">
      <div className="panel-heading"><div><p className="eyebrow">Definitions</p><h2>Routines</h2></div><select aria-label="Filter by kind" value={kindFilter} onChange={event => setKindFilter(event.target.value as RoutineKind | 'all')}><option value="all">All kinds</option>{kinds.map(kind => <option key={kind} value={kind}>{kindLabel[kind]}</option>)}</select></div>
      <div className="workspace-grid">{visibleRoutines.map(routine => <article className={`workspace-card ${routine.enabled ? 'selected' : ''}`} key={routine.id}>
        <header><span className="workspace-pill">{kindLabel[routine.kind]}</span><small>{cadenceSummary(routine)}</small></header>
        <h2>{routine.name}</h2>
        <p>{routine.description}</p>
        <p>{routine.steps.length} step{routine.steps.length === 1 ? '' : 's'}{routine.timeWindow ? ` · ${routine.timeWindow.start}–${routine.timeWindow.end}` : ''}</p>
        <footer><span>{routine.enabled ? 'Enabled' : 'Disabled'}</span><button onClick={() => { service.setRoutineEnabled(routine.id, !routine.enabled); refresh() }}>{routine.enabled ? 'Disable' : 'Enable'}</button></footer>
      </article>)}</div>
    </section>

    <section className="panel routines-history">
      <div className="panel-heading"><div><p className="eyebrow">Review</p><h2>History</h2></div><select aria-label="Filter history by routine" value={historyRoutineId} onChange={event => setHistoryRoutineId(event.target.value)}><option value="all">All routines</option>{routines.map(routine => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></div>
      {history.length ? <ul className="routine-history-list">{history.map(instance => <li key={instance.id}><span>{instance.date}</span><strong>{instance.routineName}</strong><span className={`routine-status routine-status-${instance.status}`}>{statusLabel[instance.status]}</span><span>{instance.steps.filter(step => step.status === 'done' || step.status === 'skipped').length}/{instance.steps.length} steps</span></li>)}</ul> : <p className="routines-empty">No routine instances yet.</p>}
    </section>
  </div>
}
