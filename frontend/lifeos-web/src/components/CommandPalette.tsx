import { useEffect, useMemo, useRef, useState } from 'react'
import type { ShellNavigationItem } from '../models/shell'
import type { SearchService } from '../services/SearchService'
import './CommandPalette.css'

interface Command { id: string; label: string; hint: string; run: () => void }

export function CommandPalette({ navigation, searchService }: { navigation: ShellNavigationItem[]; searchService: SearchService }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const close = () => { setOpen(false); setQuery(''); setActive(0) }
  const go = (route: string, action?: string) => { window.history.pushState(null, '', `#/${route}${action ? `?action=${action}` : ''}`); window.dispatchEvent(new HashChangeEvent('hashchange')); close() }
  const commands = useMemo<Command[]>(() => [
    ...navigation.map(item => ({ id: `open-${item.route}`, label: `Open ${item.label}`, hint: 'Navigate', run: () => go(item.route) })),
    { id: 'new-task', label: 'New Task', hint: 'Quick action', run: () => go('tasks', 'new') },
    { id: 'new-note', label: 'New Note', hint: 'Quick action', run: () => go('notes', 'new') },
    { id: 'open-today', label: 'Open Today', hint: 'Quick action', run: () => go('today') },
    { id: 'open-content', label: 'Open Content', hint: 'Quick action', run: () => go('content') },
    { id: 'open-automations', label: 'Open Automations', hint: 'Quick action', run: () => go('automations') },
  ], [navigation])
  const filtered = useMemo(() => { const words = query.toLowerCase().split(/\s+/).filter(Boolean); return commands.filter(command => words.every(word => `${command.label} ${command.hint}`.toLowerCase().includes(word))) }, [commands, query])
  const searchGroups = useMemo(() => searchService.search(query), [query, searchService])
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(value => !value) } else if (event.key === 'Escape') close() }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [])
  useEffect(() => { if (open) requestAnimationFrame(() => inputRef.current?.focus()) }, [open])
  return <><button className="search command-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog"><span aria-hidden="true">⌕</span><span>Search or run a command</span><kbd>⌘ K</kbd></button>{open && <div className="command-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close() }}><section className="command-dialog" role="dialog" aria-modal="true" aria-label="Command palette"><div className="command-input"><span aria-hidden="true">⌕</span><input ref={inputRef} value={query} onChange={event => { setQuery(event.target.value); setActive(0) }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setActive(value => Math.min(value + 1, filtered.length - 1)) } if (event.key === 'ArrowUp') { event.preventDefault(); setActive(value => Math.max(value - 1, 0)) } if (event.key === 'Enter' && filtered[active]) { event.preventDefault(); filtered[active].run() } }} placeholder="Search workspaces and data…" aria-controls="command-results" /><kbd>Esc</kbd></div><div className="command-results" id="command-results" role="listbox">{filtered.length > 0 && <p className="command-group-label">Commands</p>}{filtered.map((command, index) => <button key={command.id} className={index === active ? 'active' : ''} role="option" aria-selected={index === active} onMouseEnter={() => setActive(index)} onClick={command.run}><span>{command.label}</span><small>{command.hint}</small></button>)}{searchGroups.map(group => <section className="search-group" key={group.source}><p className="command-group-label">{group.source}</p>{group.results.map(item => <button key={`${item.source}-${item.id}`} onClick={() => go(item.route)}><span><strong>{item.title}</strong><small>{item.description}</small></span><small>Open</small></button>)}</section>)}{!filtered.length && !searchGroups.length && <p>No matching results</p>}</div></section></div>}</>
}
