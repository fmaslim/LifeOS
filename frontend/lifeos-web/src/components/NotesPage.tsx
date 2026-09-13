import { useMemo, useState } from 'react'
import type { Note, NoteData, NoteDomain } from '../models/note'
import { StatePanel } from './StatePanel'
import './NotesPage.css'

type View = 'inbox' | 'pinned' | 'all'
type Draft = Pick<Note, 'title' | 'body' | 'domain'> & { tags: string }
const domains: NoteDomain[] = ['Work', 'Content', 'Home', 'Health', 'Finance', 'Personal']
const blank: Draft = { title: '', body: '', domain: 'Personal', tags: '' }
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))

function NoteForm({ note, onSave, onCancel }: { note: Note | null; onSave: (draft: Draft) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Draft>(note ? { title: note.title, body: note.body, domain: note.domain, tags: note.tags.join(', ') } : blank)
  return <form className="note-form" onSubmit={event => { event.preventDefault(); if (draft.title.trim() || draft.body.trim()) onSave(draft) }}>
    <div className="note-form-head"><div><p className="eyebrow">Capture</p><h2>{note ? 'Edit note' : 'New note'}</h2></div><button type="button" aria-label="Close note form" onClick={onCancel}>×</button></div>
    <label>Title<input autoFocus value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="Give this thought a name" /></label>
    <label>Note<textarea required value={draft.body} onChange={event => setDraft(current => ({ ...current, body: event.target.value }))} placeholder="Write it down before it disappears…" /></label>
    <div className="note-form-grid"><label>Domain<select value={draft.domain} onChange={event => setDraft(current => ({ ...current, domain: event.target.value as NoteDomain }))}>{domains.map(domain => <option key={domain}>{domain}</option>)}</select></label><label>Tags<input value={draft.tags} onChange={event => setDraft(current => ({ ...current, tags: event.target.value }))} placeholder="idea, follow-up" /></label></div>
    <div className="note-form-actions"><button type="button" onClick={onCancel}>Cancel</button><button className="primary-button">Save note</button></div>
  </form>
}

export function NotesPage({ data }: { data: NoteData }) {
  const [notes, setNotes] = useState(data.notes)
  const [view, setView] = useState<View>('inbox')
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState<NoteDomain | 'All'>('All')
  const [editing, setEditing] = useState<Note | null | undefined>(undefined)
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return notes.filter(note => (view === 'all' || (view === 'inbox' ? note.inbox : note.pinned)) && (domain === 'All' || note.domain === domain) && (!needle || `${note.title} ${note.body} ${note.tags.join(' ')}`.toLowerCase().includes(needle))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }, [notes, view, query, domain])
  const save = (draft: Draft) => { const now = new Date().toISOString(); const normalized = { title: draft.title.trim() || 'Untitled note', body: draft.body.trim(), domain: draft.domain, tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean), updatedAt: now }; if (editing) setNotes(current => current.map(note => note.id === editing.id ? { ...note, ...normalized } : note)); else setNotes(current => [{ ...normalized, id: `note-${Date.now()}`, pinned: false, inbox: true, createdAt: now }, ...current]); setEditing(undefined) }
  return <div className="dashboard notes-page"><section className="notes-hero"><div><p className="eyebrow">Capture & remember</p><h1>Notes</h1><p className="subtitle">A quiet place for ideas, decisions, and follow-ups.</p></div><button className="primary-button" onClick={() => setEditing(null)}>+ Quick capture</button></section>
    {editing !== undefined && <NoteForm note={editing} onSave={save} onCancel={() => setEditing(undefined)} />}
    <section className="panel notes-panel"><div className="notes-toolbar"><div className="note-tabs" aria-label="Note views">{(['inbox', 'pinned', 'all'] as View[]).map(item => <button className={view === item ? 'active' : ''} onClick={() => setView(item)} key={item}>{item[0].toUpperCase() + item.slice(1)} <span>{item === 'all' ? notes.length : notes.filter(note => item === 'inbox' ? note.inbox : note.pinned).length}</span></button>)}</div><div className="note-search"><input aria-label="Search notes" placeholder="Search notes or tags" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Filter notes by domain" value={domain} onChange={event => setDomain(event.target.value as NoteDomain | 'All')}><option>All</option>{domains.map(item => <option key={item}>{item}</option>)}</select></div></div>
      <div className="note-grid">{filtered.length ? filtered.map(note => <article className={`note-card ${note.pinned ? 'is-pinned' : ''}`} key={note.id}><header><span>{note.domain}</span><button aria-label={`${note.pinned ? 'Unpin' : 'Pin'} ${note.title}`} onClick={() => setNotes(current => current.map(item => item.id === note.id ? { ...item, pinned: !item.pinned, inbox: false, updatedAt: new Date().toISOString() } : item))}>{note.pinned ? '★' : '☆'}</button></header><h2>{note.title}</h2><p>{note.body}</p><div className="note-tags">{note.tags.map(tag => <span key={tag}>#{tag}</span>)}</div><footer><time>Updated {dateLabel(note.updatedAt)}</time><div><button onClick={() => setEditing(note)}>Edit</button><button onClick={() => setNotes(current => current.filter(item => item.id !== note.id))}>Delete</button></div></footer></article>) : <StatePanel kind="empty" title="No notes found" description="Capture a new thought or change your filters." />}</div>
    </section>
  </div>
}
