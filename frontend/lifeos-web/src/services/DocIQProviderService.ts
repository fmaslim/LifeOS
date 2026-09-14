import { docIQMockData } from '../data/docIQMockData'
import type { DocIQData, DocIQMetric, RecentAnalysis, FlaggedRisk, SystemStatus } from '../models/dociq'
import { localStore } from '../storage/LocalStore'

export type DocIQProviderStatus = 'connected' | 'disconnected' | 'unauthorized' | 'rate-limited' | 'stale' | 'unavailable'
export interface DocIQProviderActivity { id: string; type: string; title: string; detail?: string | null; timestamp: string; deepLink?: string | null; severity?: string }
interface ProviderMetric { name: string; value: number; unit?: string | null; detail?: string | null }
interface ProviderSnapshot { status: Exclude<DocIQProviderStatus, 'stale'>; checkedAt: string; metrics: ProviderMetric[]; activity: DocIQProviderActivity[]; serviceHealth?: string | null; deepLinkBase?: string | null; message?: string | null }
export interface DocIQProviderCache { status: DocIQProviderStatus; checkedAt?: string; data: DocIQData; activity: DocIQProviderActivity[]; message?: string; deepLinkBase?: string }

const CACHE_KEY = 'dociq-provider-cache'
const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')
const metricIcon = (name: string): DocIQMetric['icon'] => /fail|error|risk/i.test(name) ? 'alert' : /analysis/i.test(name) ? 'scan' : /active|signup|plan/i.test(name) ? 'check' : 'files'
const metricTone = (name: string): DocIQMetric['tone'] => /fail|error|risk/i.test(name) ? 'rose' : /active|signup|plan/i.test(name) ? 'green' : /analysis/i.test(name) ? 'blue' : 'violet'
const labelFor = (name: string) => name.split(/[-_]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

export function mapDocIQSnapshot(snapshot: ProviderSnapshot): DocIQProviderCache {
  const age = Date.now() - new Date(snapshot.checkedAt).getTime()
  const status: DocIQProviderStatus = snapshot.status === 'connected' && age > 15 * 60_000 ? 'stale' : snapshot.status
  const metrics: DocIQMetric[] = snapshot.metrics.map(metric => ({
    label: labelFor(metric.name), value: `${metric.value}${metric.unit ?? ''}`, detail: metric.detail ?? 'Live DocIQ signal', icon: metricIcon(metric.name), tone: metricTone(metric.name),
  }))
  const analyses: RecentAnalysis[] = snapshot.activity.filter(item => /analysis|upload|document/i.test(item.type)).slice(0, 6).map(item => ({ name: item.title, type: labelFor(item.type), updatedAt: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(item.timestamp)), state: /fail|error/i.test(item.severity ?? '') ? 'Needs review' : 'Processed', score: 'Live' }))
  const risks: FlaggedRisk[] = snapshot.activity.filter(item => /fail|error|risk/i.test(`${item.type} ${item.severity ?? ''}`)).slice(0, 5).map(item => ({ title: item.title, document: 'DocIQ', severity: /critical|high/i.test(item.severity ?? '') ? 'High' : /medium|warning/i.test(item.severity ?? '') ? 'Medium' : 'Low', detail: item.detail ?? 'Provider event requires attention.' }))
  const health: SystemStatus[] = [{ name: 'DocIQ API', detail: snapshot.message ?? `Last checked ${new Date(snapshot.checkedAt).toLocaleString()}`, status: snapshot.serviceHealth?.toLowerCase() === 'healthy' || status === 'connected' ? 'Operational' : 'Monitoring' }]
  const deepLinkBase = snapshot.deepLinkBase ?? undefined
  const data: DocIQData = {
    updatedLabel: status === 'stale' ? 'Provider data is stale' : status === 'connected' ? 'Live from DocIQ' : snapshot.message ?? 'DocIQ provider unavailable',
    metrics: metrics.length ? metrics : docIQMockData.metrics,
    recentAnalyses: analyses.length ? analyses : [],
    risks,
    actions: [
      { title: 'Open uploads', detail: 'Continue document intake in DocIQ.', action: 'Open DocIQ', icon: 'upload', href: deepLinkBase ? `${deepLinkBase}/upload` : undefined },
      { title: 'Review analyses', detail: 'Inspect recent analyses and customer signals.', action: 'View analyses', icon: 'review', href: deepLinkBase ? `${deepLinkBase}/history` : undefined },
    ],
    systemStatus: health,
  }
  return { status, checkedAt: snapshot.checkedAt, data, activity: snapshot.activity, message: snapshot.message ?? undefined, deepLinkBase }
}

export class DocIQProviderService {
  getCached(): DocIQProviderCache | null { return localStore.read<DocIQProviderCache | null>(CACHE_KEY, null) }
  async refresh(): Promise<DocIQProviderCache> {
    try {
      const response = await fetch(`${apiBase}/api/dociq/summary`, { credentials: 'include', headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const status: DocIQProviderStatus = response.status === 401 ? 'unauthorized' : 'unavailable'
        const fallback = { status, data: docIQMockData, activity: [], message: 'DocIQ provider is unavailable.' } satisfies DocIQProviderCache
        localStore.write(CACHE_KEY, fallback); return fallback
      }
      const mapped = mapDocIQSnapshot(await response.json() as ProviderSnapshot)
      localStore.write(CACHE_KEY, mapped)
      return mapped
    } catch {
      const existing = this.getCached()
      if (existing) return { ...existing, status: 'stale', message: 'Using the last successful DocIQ snapshot.' }
      return { status: 'unavailable', data: docIQMockData, activity: [], message: 'DocIQ provider is unavailable.' }
    }
  }
  requestAction(action: string) { return { status: 'approval-required' as const, action: `dociq.${action}` } }
}

export const docIQProviderService = new DocIQProviderService()
