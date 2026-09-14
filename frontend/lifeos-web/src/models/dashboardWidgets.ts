export type DashboardWidgetId = 'summary' | 'operations' | 'activity'

export interface DashboardWidgetPreference {
  id: DashboardWidgetId
  visible: boolean
}

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId
  label: string
  description: string
}

export const dashboardWidgetDefinitions: DashboardWidgetDefinition[] = [
  { id: 'summary', label: 'Workspace summary', description: 'Key metrics across LifeOS' },
  { id: 'operations', label: "Today's operations", description: 'Current priorities and actions' },
  { id: 'activity', label: 'Recent activity', description: 'Latest system events' },
]

export const defaultDashboardWidgets: DashboardWidgetPreference[] = dashboardWidgetDefinitions.map(widget => ({ id: widget.id, visible: true }))

export function normalizeDashboardWidgets(value: unknown): DashboardWidgetPreference[] {
  if (!Array.isArray(value)) return defaultDashboardWidgets.map(widget => ({ ...widget }))
  const supported = new Set(dashboardWidgetDefinitions.map(widget => widget.id))
  const seen = new Set<DashboardWidgetId>()
  const valid: DashboardWidgetPreference[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const candidate = entry as { id?: unknown; visible?: unknown }
    if (typeof candidate.id !== 'string' || !supported.has(candidate.id as DashboardWidgetId) || seen.has(candidate.id as DashboardWidgetId)) continue
    const id = candidate.id as DashboardWidgetId
    seen.add(id)
    valid.push({ id, visible: typeof candidate.visible === 'boolean' ? candidate.visible : true })
  }
  if (!valid.length) return defaultDashboardWidgets.map(widget => ({ ...widget }))
  for (const widget of defaultDashboardWidgets) if (!seen.has(widget.id)) valid.push({ ...widget })
  return valid
}
