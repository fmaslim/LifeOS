import { useMemo, useState } from 'react'
import type { Task, TaskDomain, TaskPriority, TaskStatus } from '../models/task'
import { StatePanel } from './StatePanel'
import { storageKeys } from '../storage/storageKeys'
import { usePersistentState } from '../storage/usePersistentState'
import './TasksPage.css'

type TaskPageState = 'ready' | 'loading' | 'error'
type FilterValue<T extends string> = 'all' | T
type DraftTask = Omit<Task, 'id'>
interface TasksPageProps { tasks: Task[]; state?: TaskPageState }

const domains: TaskDomain[] = ['Work', 'Home', 'Health', 'Finances', 'Personal']
const priorities: TaskPriority[] = ['high', 'medium', 'low']
const statuses: TaskStatus[] = ['todo', 'in-progress', 'completed']
const blankDraft: DraftTask = { title: '', domain: 'Work', priority: 'medium', status: 'todo', dueDate: '', source: '' }
const statusLabel = (status: TaskStatus) => status === 'in-progress' ? 'In progress' : status === 'todo' ? 'To do' : 'Completed'
const localDate = () => new Date().toISOString().slice(0, 10)

function TaskForm({ task, onSave, onCancel }: { task: Task | null; onSave: (draft: DraftTask) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<DraftTask>(task ? { ...task } : blankDraft)
  const update = <K extends keyof DraftTask>(key: K, value: DraftTask[K]) => setDraft(current => ({ ...current, [key]: value }))
  return <form className="task-form" onSubmit={event => { event.preventDefault(); if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim(), dueDate: draft.dueDate || undefined, source: draft.source?.trim() || undefined }) }}>
    <div className="task-form-heading"><div><p className="eyebrow">Task details</p><h2>{task ? 'Edit task' : 'Create task'}</h2></div><button type="button" className="task-close" onClick={onCancel} aria-label="Close task form">×</button></div>
    <label className="task-field task-title-field">Title<input autoFocus value={draft.title} onChange={event => update('title', event.target.value)} placeholder="What needs to get done?" required /></label>
    <div className="task-form-grid"><label className="task-field">Domain<select value={draft.domain} onChange={event => update('domain', event.target.value as TaskDomain)}>{domains.map(domain => <option key={domain}>{domain}</option>)}</select></label><label className="task-field">Priority<select value={draft.priority} onChange={event => update('priority', event.target.value as TaskPriority)}>{priorities.map(priority => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label><label className="task-field">Status<select value={draft.status} onChange={event => update('status', event.target.value as TaskStatus)}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label><label className="task-field">Due date<input type="date" value={draft.dueDate ?? ''} onChange={event => update('dueDate', event.target.value)} /></label></div>
    <label className="task-field">Source <input value={draft.source ?? ''} onChange={event => update('source', event.target.value)} placeholder="Optional workspace or context" /></label>
    <div className="task-form-actions"><button type="button" className="task-cancel" onClick={onCancel}>Cancel</button><button className="primary-button" type="submit">{task ? 'Save changes' : 'Create task'}</button></div>
  </form>
}

export function TasksPage({ tasks: initialTasks, state = 'ready' }: TasksPageProps) {
  const [tasks, setTasks] = usePersistentState(storageKeys.tasks, initialTasks)
  const [status, setStatus] = useState<FilterValue<TaskStatus>>('all')
  const [priority, setPriority] = useState<FilterValue<TaskPriority>>('all')
  const [domain, setDomain] = useState<FilterValue<TaskDomain>>('all')
  const [due, setDue] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'none'>('all')
  const [editingTask, setEditingTask] = useState<Task | null | undefined>(() => window.location.hash.includes('action=new') ? null : undefined)
  const today = localDate()
  const filteredTasks = useMemo(() => tasks.filter(task => (status === 'all' || task.status === status) && (priority === 'all' || task.priority === priority) && (domain === 'all' || task.domain === domain) && (due === 'all' || (due === 'overdue' && !!task.dueDate && task.dueDate < today && task.status !== 'completed') || (due === 'today' && task.dueDate === today) || (due === 'upcoming' && !!task.dueDate && task.dueDate > today) || (due === 'none' && !task.dueDate))), [tasks, status, priority, domain, due, today])
  const activeCount = tasks.filter(task => task.status !== 'completed').length
  const completeTask = (id: string) => setTasks(current => current.map(task => task.id === id ? { ...task, status: task.status === 'completed' ? 'todo' : 'completed' } : task))
  const saveTask = (draft: DraftTask) => {
    if (editingTask) setTasks(current => current.map(task => task.id === editingTask.id ? { ...draft, id: task.id } : task))
    else setTasks(current => [{ ...draft, id: `task-${Date.now()}` }, ...current])
    setEditingTask(undefined)
  }
  const dateIndicator = (task: Task) => {
    if (!task.dueDate) return 'No due date'
    if (task.status !== 'completed' && task.dueDate < today) return 'Overdue'
    if (task.dueDate === today) return 'Due today'
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${task.dueDate}T00:00:00`))
  }
  const resetFilters = () => { setStatus('all'); setPriority('all'); setDomain('all'); setDue('all') }
  const heading = <section className="tasks-hero"><div><p className="eyebrow">Action center</p><h1>Tasks</h1><p className="subtitle">A calm, complete view of what needs your attention.</p></div><button className="primary-button tasks-create" onClick={() => setEditingTask(null)}>+ New task</button></section>
  if (state === 'loading') return <div className="dashboard tasks-page">{heading}<StatePanel kind="loading" title="Loading tasks" description="Preparing your action queue." /></div>
  if (state === 'error') return <div className="dashboard tasks-page">{heading}<StatePanel kind="error" title="Unable to load tasks" description="Try again when your workspace is available." /></div>
  return <div className="dashboard tasks-page">{heading}
    {editingTask !== undefined && <TaskForm task={editingTask} onSave={saveTask} onCancel={() => setEditingTask(undefined)} />}
    <section className="tasks-summary"><div><span>{activeCount}</span><p>open tasks</p></div><div><span>{tasks.filter(task => task.status !== 'completed' && task.dueDate === today).length}</span><p>due today</p></div><div><span>{tasks.filter(task => task.status !== 'completed' && task.dueDate && task.dueDate < today).length}</span><p>need attention</p></div></section>
    <section className="panel tasks-panel"><div className="tasks-toolbar"><div><p className="eyebrow">Your queue</p><h2>All tasks <span>{filteredTasks.length}</span></h2></div><button className="text-button" onClick={resetFilters}>Reset filters</button></div>
      <div className="task-filters" aria-label="Task filters"><label>Status<select value={status} onChange={event => setStatus(event.target.value as FilterValue<TaskStatus>)}><option value="all">All statuses</option>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label>Priority<select value={priority} onChange={event => setPriority(event.target.value as FilterValue<TaskPriority>)}><option value="all">All priorities</option>{priorities.map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label><label>Domain<select value={domain} onChange={event => setDomain(event.target.value as FilterValue<TaskDomain>)}><option value="all">All domains</option>{domains.map(value => <option key={value}>{value}</option>)}</select></label><label>Due<select value={due} onChange={event => setDue(event.target.value as typeof due)}><option value="all">Any time</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Upcoming</option><option value="none">No due date</option></select></label></div>
      <div className="task-list">{filteredTasks.length ? filteredTasks.map(task => <article className={`task-row ${task.status === 'completed' ? 'is-completed' : ''}`} key={task.id}><button className="task-check" aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => completeTask(task.id)}>✓</button><div className="task-copy"><h3>{task.title}</h3><div className="task-meta"><span className={`task-domain ${task.domain.toLowerCase()}`}>{task.domain}</span><span className={`task-priority ${task.priority}`}>{task.priority}</span>{task.source && <span>{task.source}</span>}</div></div><div className={`task-due ${dateIndicator(task).toLowerCase().replace(' ', '-')}`}><span>{dateIndicator(task)}</span><small>{statusLabel(task.status)}</small></div><button className="task-edit" onClick={() => setEditingTask(task)}>Edit</button></article>) : <StatePanel kind="empty" title="No tasks match these filters" description="Try a different filter or add a task to this workspace." />}</div>
    </section>
  </div>
}
