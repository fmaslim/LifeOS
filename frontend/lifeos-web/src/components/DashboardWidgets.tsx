import { useState, type ReactNode } from 'react'
import { dashboardWidgetDefinitions, defaultDashboardWidgets, normalizeDashboardWidgets, type DashboardWidgetId } from '../models/dashboardWidgets'
import { storageKeys } from '../storage/storageKeys'
import { usePersistentState } from '../storage/usePersistentState'
import './DashboardWidgets.css'

export function DashboardWidgets({ widgets }: { widgets: Record<DashboardWidgetId, ReactNode> }) {
  const [stored, setStored] = usePersistentState<unknown>(storageKeys.dashboardWidgets, defaultDashboardWidgets)
  const [editing, setEditing] = useState(false)
  const preferences = normalizeDashboardWidgets(stored)
  const update = (id: DashboardWidgetId, patch: { visible?: boolean; move?: number }) => {
    const next = preferences.map(item => ({ ...item }))
    const index = next.findIndex(item => item.id === id)
    if (patch.visible !== undefined) next[index].visible = patch.visible
    if (patch.move) {
      const target = index + patch.move
      if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]]
    }
    setStored(next)
  }
  const visible = preferences.filter(item => item.visible)
  return <>
    <div className="dashboard-customize-row"><button className="text-button" aria-expanded={editing} onClick={() => setEditing(value => !value)}>Customize dashboard</button></div>
    {editing && <section className="dashboard-customizer panel" aria-label="Dashboard widgets"><div><p className="eyebrow">Dashboard layout</p><h2>Choose and order widgets</h2></div><div className="dashboard-customizer-list">{preferences.map((preference, index) => { const definition = dashboardWidgetDefinitions.find(item => item.id === preference.id)!; return <article key={preference.id}><label><input type="checkbox" checked={preference.visible} onChange={event => update(preference.id, { visible: event.target.checked })} /><span><strong>{definition.label}</strong><small>{definition.description}</small></span></label><div><button aria-label={`Move ${definition.label} up`} disabled={index === 0} onClick={() => update(preference.id, { move: -1 })}>↑</button><button aria-label={`Move ${definition.label} down`} disabled={index === preferences.length - 1} onClick={() => update(preference.id, { move: 1 })}>↓</button></div></article> })}</div><button className="text-button" onClick={() => setStored(defaultDashboardWidgets.map(item => ({ ...item })))}>Reset to default</button></section>}
    {visible.length ? <div className="dashboard-widget-grid">{visible.map(item => <div className={`dashboard-widget dashboard-widget-${item.id}`} key={item.id}>{widgets[item.id]}</div>)}</div> : <section className="panel dashboard-widget-empty"><h2>Your dashboard is clear</h2><p>Open customization to restore a widget or reset the default layout.</p></section>}
  </>
}
