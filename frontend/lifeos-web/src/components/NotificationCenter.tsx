import { useEffect, useMemo, useRef, useState } from 'react'
import type { LifeNotification, NotificationData, NotificationSeverity, NotificationSource } from '../models/notification'
import { StatePanel } from './StatePanel'
import { storageKeys } from '../storage/storageKeys'
import { usePersistentState } from '../storage/usePersistentState'
import './NotificationCenter.css'

export function NotificationCenter({ data }: { data: NotificationData }) {
  const [items, setItems] = usePersistentState(storageKeys.notifications, data.notifications)
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState<NotificationSource | 'all'>('all')
  const [severity, setSeverity] = useState<NotificationSeverity | 'all'>('all')
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const shown = useMemo(() => items.filter(item => (source === 'all' || item.source === source) && (severity === 'all' || item.severity === severity)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [items, source, severity])
  const unread = items.filter(item => !item.read).length
  const mark = (id: string) => setItems(current => current.map(item => item.id === id ? { ...item, read: true } : item))
  const go = (item: LifeNotification) => { mark(item.id); if (item.route) { window.history.pushState(null, '', `#/${item.route}`); window.dispatchEvent(new HashChangeEvent('hashchange')) } setOpen(false); trigger.current?.focus() }
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }; const outside = (event: MouseEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false) }; document.addEventListener('keydown', close); document.addEventListener('mousedown', outside); return () => { document.removeEventListener('keydown', close); document.removeEventListener('mousedown', outside) } }, [open])
  return <div className="notification-root">
    <button ref={trigger} className="icon-button notification-trigger" aria-label={`${unread} unread notifications`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}><span aria-hidden="true">♢</span>{unread > 0 && <b aria-hidden="true">{unread}</b>}</button>
    {open && <section ref={panel} className="notification-panel" role="dialog" aria-label="Notifications">
      <header><div><p className="eyebrow">Signals</p><h2>Notifications</h2></div><button onClick={() => setItems(current => current.map(item => ({ ...item, read: true })))}>Mark all read</button></header>
      <div className="notification-filters"><select aria-label="Filter notifications by source" value={source} onChange={event => setSource(event.target.value as typeof source)}><option value="all">All sources</option>{[...new Set(items.map(item => item.source))].map(item => <option key={item}>{item}</option>)}</select><select aria-label="Filter notifications by severity" value={severity} onChange={event => setSeverity(event.target.value as typeof severity)}><option value="all">All priority</option><option value="critical">Critical</option><option value="important">Important</option><option value="normal">Normal</option></select></div>
      <div className="notification-list">{shown.length ? shown.map(item => <article className={`${item.read ? 'read' : 'unread'} ${item.severity}`} key={item.id}><button className="notification-copy" onClick={() => go(item)}><span><strong>{item.title}</strong><small>{item.source} · {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(item.timestamp))}</small></span><p>{item.message}</p></button>{!item.read && <button className="mark-read" onClick={() => mark(item.id)}>Mark read</button>}</article>) : <StatePanel kind="empty" title="No notifications" description="No signals match these filters." />}</div>
    </section>}
  </div>
}
