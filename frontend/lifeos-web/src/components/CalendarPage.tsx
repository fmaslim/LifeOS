import { useMemo, useState } from 'react'
import type { CalendarCategory, CalendarData, CalendarEvent } from '../models/calendar'
import { StatePanel } from './StatePanel'
import './CalendarPage.css'

type CalendarView = 'agenda' | 'week'
type EventDraft = Omit<CalendarEvent, 'id'>
const categoryNames: CalendarCategory[] = ['work', 'content', 'home', 'health', 'finance', 'automation']
const atMidnight = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())
const toIso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const fromIso = (value: string) => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day) }
const dayStart = (value: Date) => { const day = atMidnight(value); day.setDate(day.getDate() - ((day.getDay() + 6) % 7)); return day }
const addDays = (value: Date, amount: number) => { const day = new Date(value); day.setDate(day.getDate() + amount); return day }
const dayLabel = (value: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(fromIso(value))
const shortTime = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${value}`)) : 'All day'
const blankDraft = (date: string): EventDraft => ({ title: '', date, category: 'work', allDay: false, startTime: '09:00', endTime: '09:30', description: '' })

function EventForm({ event, initialDate, onSave, onCancel }: { event: CalendarEvent | null; initialDate: string; onSave: (draft: EventDraft) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<EventDraft>(event ? { ...event } : blankDraft(initialDate))
  const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft(current => ({ ...current, [key]: value }))
  return <form className="calendar-form" onSubmit={submit => { submit.preventDefault(); if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim(), startTime: draft.allDay ? undefined : draft.startTime, endTime: draft.allDay ? undefined : draft.endTime }) }}>
    <div className="calendar-form-head"><div><p className="eyebrow">Calendar event</p><h2>{event ? 'Edit event' : 'Add event'}</h2></div><button type="button" className="calendar-close" onClick={onCancel} aria-label="Close event form">×</button></div>
    <label className="calendar-field calendar-title">Title<input autoFocus required value={draft.title} onChange={e => update('title', e.target.value)} placeholder="What is happening?" /></label>
    <div className="calendar-form-grid"><label className="calendar-field">Date<input type="date" value={draft.date} onChange={e => update('date', e.target.value)} /></label><label className="calendar-field">Category<select value={draft.category} onChange={e => update('category', e.target.value as CalendarCategory)}>{categoryNames.map(category => <option value={category} key={category}>{category[0].toUpperCase() + category.slice(1)}</option>)}</select></label></div>
    <label className="calendar-toggle"><input type="checkbox" checked={draft.allDay} onChange={e => update('allDay', e.target.checked)} /> All-day event</label>
    {!draft.allDay && <div className="calendar-form-grid"><label className="calendar-field">Starts<input type="time" value={draft.startTime ?? ''} onChange={e => update('startTime', e.target.value)} required /></label><label className="calendar-field">Ends<input type="time" value={draft.endTime ?? ''} onChange={e => update('endTime', e.target.value)} required /></label></div>}
    <label className="calendar-field">Notes<textarea value={draft.description ?? ''} onChange={e => update('description', e.target.value)} placeholder="Optional context" /></label>
    <div className="calendar-form-actions"><button type="button" className="calendar-cancel" onClick={onCancel}>Cancel</button><button className="primary-button">{event ? 'Save event' : 'Add event'}</button></div>
  </form>
}

export function CalendarPage({ data }: { data: CalendarData }) {
  const today = toIso(new Date())
  const [events, setEvents] = useState(data.events)
  const [view, setView] = useState<CalendarView>('agenda')
  const [selectedDate, setSelectedDate] = useState(today)
  const [category, setCategory] = useState<CalendarCategory | 'all'>('all')
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(undefined)
  const filtered = useMemo(() => events.filter(event => category === 'all' || event.category === category), [events, category])
  const selectedEvents = useMemo(() => filtered.filter(event => event.date === selectedDate).sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.startTime ?? '').localeCompare(b.startTime ?? '')), [filtered, selectedDate])
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(dayStart(fromIso(selectedDate)), index)), [selectedDate])
  const save = (draft: EventDraft) => { if (editing) setEvents(current => current.map(event => event.id === editing.id ? { ...draft, id: event.id } : event)); else setEvents(current => [...current, { ...draft, id: `calendar-${Date.now()}` }]); setEditing(undefined) }
  const step = (amount: number) => setSelectedDate(current => toIso(addDays(fromIso(current), view === 'week' ? amount * 7 : amount)))
  const eventCard = (event: CalendarEvent, compact = false) => <article className={`calendar-event ${event.allDay ? 'all-day' : 'timed'} ${compact ? 'compact' : ''}`} style={{ '--event-color': data.categories[event.category].color } as React.CSSProperties} key={event.id}><span className="calendar-event-dot" /><div><strong>{event.title}</strong><p>{event.allDay ? 'All day' : `${shortTime(event.startTime)} – ${shortTime(event.endTime)}`} · {data.categories[event.category].label}</p>{event.description && !compact && <small>{event.description}</small>}</div><div className="calendar-event-actions"><button onClick={() => setEditing(event)}>Edit</button><button onClick={() => setEvents(current => current.filter(item => item.id !== event.id))}>Delete</button></div></article>
  const title = view === 'week' ? `${new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(week[0])} – ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(week[6])}` : dayLabel(selectedDate)
  return <div className="dashboard calendar-page"><section className="calendar-hero"><div><p className="eyebrow">LifeOS schedule</p><h1>Calendar</h1><p className="subtitle">Make room for the work and life that matter.</p></div><button className="primary-button" onClick={() => setEditing(null)}>+ New event</button></section>
    {editing !== undefined && <EventForm event={editing} initialDate={selectedDate} onSave={save} onCancel={() => setEditing(undefined)} />}
    <section className="calendar-panel panel"><div className="calendar-toolbar"><div className="calendar-nav"><button aria-label="Previous period" onClick={() => step(-1)}>‹</button><button onClick={() => setSelectedDate(today)}>Today</button><button aria-label="Next period" onClick={() => step(1)}>›</button><h2>{title}</h2></div><div className="calendar-views" aria-label="Calendar view"><button className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')}>Agenda</button><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Week</button></div></div>
      <div className="calendar-category-bar"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>All calendars</button>{categoryNames.map(item => <button className={category === item ? 'active' : ''} style={{ '--category-color': data.categories[item].color } as React.CSSProperties} onClick={() => setCategory(item)} key={item}><i />{data.categories[item].label}</button>)}</div>
      {view === 'agenda' ? <div className="agenda-view"><div className="agenda-day"><span>{fromIso(selectedDate).getDate()}</span><p>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(fromIso(selectedDate))}</p></div><div className="agenda-events">{selectedEvents.length ? selectedEvents.map(event => eventCard(event)) : <StatePanel kind="empty" title="A clear day" description="Nothing is scheduled here yet. Add an event when you are ready." />}</div></div> : <div className="week-view">{week.map(day => { const date = toIso(day); const dayEvents = filtered.filter(event => event.date === date).sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.startTime ?? '').localeCompare(b.startTime ?? '')); return <section className={`week-day ${date === today ? 'is-today' : ''}`} key={date}><button className="week-heading" onClick={() => { setSelectedDate(date); setView('agenda') }}><span>{new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day)}</span><strong>{day.getDate()}</strong></button><div className="week-events">{dayEvents.map(event => eventCard(event, true))}</div></section> })}</div>}
    </section>
  </div>
}
