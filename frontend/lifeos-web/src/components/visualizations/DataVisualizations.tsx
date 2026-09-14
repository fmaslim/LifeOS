import type { ReactNode } from 'react'
import type { DashboardTone } from '../../models/dashboard'
import { clampPercent, linePath, normalizePoints, type ChartPoint } from './visualizationMath'
import './DataVisualizations.css'

type ChartProps = { label: string; points?: ChartPoint[]; loading?: boolean }

function ChartState({ label, loading, children }: { label: string; loading?: boolean; children: ReactNode }) {
  if (loading) return <div className="viz-state" role="status" aria-live="polite">Loading {label.toLowerCase()}…</div>
  return children
}

export function KpiCard({ label, value, detail, tone = 'violet', icon, loading = false }: { label: string; value: string; detail?: string; tone?: DashboardTone; icon?: ReactNode; loading?: boolean }) {
  return <article className={`viz-kpi ${tone}`} aria-label={`${label}: ${value}`} aria-busy={loading}>{icon && <div className="viz-kpi-icon">{icon}</div>}<p>{label}</p>{loading ? <span className="viz-skeleton" /> : <><strong>{value}</strong>{detail && <span>{detail}</span>}</>}</article>
}

export function ProgressBar({ label, value, tone = 'violet' }: { label: string; value: number; tone?: DashboardTone }) {
  const percent = clampPercent(value)
  return <div className={`viz-progress ${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span style={{ width: `${percent}%` }} /></div>
}

export function TrendIndicator({ value, label = 'trend' }: { value: number; label?: string }) {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  return <span className={`viz-trend ${direction}`} aria-label={`${label}: ${direction} ${Math.abs(value)} percent`}><span aria-hidden="true">{direction === 'up' ? '↗' : direction === 'down' ? '↘' : '→'}</span>{Math.abs(value)}%</span>
}

export function BarChart({ label, points = [], loading = false }: ChartProps) {
  return <ChartState label={label} loading={loading}>{points.length ? <figure className="viz-chart" aria-label={label}><div className="viz-bars">{normalizePoints(points).map((height, index) => <div className="viz-bar-column" key={`${points[index].label}-${index}`}><span style={{ height: `${height}%` }} title={`${points[index].label}: ${points[index].value}`} /><small>{points[index].label}</small></div>)}</div><figcaption className="sr-only">{points.map(point => `${point.label}: ${point.value}`).join(', ')}</figcaption></figure> : <div className="viz-state">No data available for {label.toLowerCase()}.</div>}</ChartState>
}

export function LineChart({ label, points = [], loading = false }: ChartProps) {
  return <ChartState label={label} loading={loading}>{points.length ? <figure className="viz-chart" aria-label={label}><svg className="viz-line" viewBox="0 -3 100 46" preserveAspectRatio="none" role="img" aria-label={points.map(point => `${point.label}: ${point.value}`).join(', ')}><path d={linePath(points)} /></svg><div className="viz-axis">{points.map(point => <small key={point.label}>{point.label}</small>)}</div></figure> : <div className="viz-state">No data available for {label.toLowerCase()}.</div>}</ChartState>
}
