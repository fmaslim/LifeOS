import { homeMockData } from '../data/homeMockData'
import type { HomeData, HomeMetric, HomeSystem, HouseholdActivity } from '../models/home'
import { localStore } from '../storage/LocalStore'

export type HomeProviderStatus = 'connected' | 'disconnected' | 'unauthorized' | 'rate-limited' | 'stale' | 'unavailable' | 'unsupported'
interface Device { id: string; name: string; category: string; status: string; detail: string; updatedAt: string }
interface Utility { id: string; name: string; usage?: number | null; unit?: string | null; cost?: number | null; updatedAt: string }
export interface HomeAlert { id: string; source: string; title: string; detail: string; severity: string; timestamp: string }
interface SourceSnapshot { source: string; status: Exclude<HomeProviderStatus, 'stale'>; checkedAt: string; devices: Device[]; utilities: Utility[]; alerts: HomeAlert[]; message?: string | null }
interface Snapshot { checkedAt: string; sources: SourceSnapshot[] }
export interface HomeProviderCache { status: HomeProviderStatus; checkedAt?: string; data: HomeData; alerts: HomeAlert[]; sources: SourceSnapshot[]; message?: string }

const CACHE_KEY = 'home-provider-cache'
const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

function statusFor(source: SourceSnapshot): HomeProviderStatus {
  if (source.status !== 'connected') return source.status
  return Date.now() - new Date(source.checkedAt).getTime() > 15 * 60_000 ? 'stale' : 'connected'
}

export function mapHomeSnapshot(snapshot: Snapshot): HomeProviderCache {
  const connected = snapshot.sources.filter(source => statusFor(source) === 'connected')
  const stale = snapshot.sources.filter(source => statusFor(source) === 'stale')
  const devices = snapshot.sources.flatMap(source => source.devices)
  const utilities = snapshot.sources.flatMap(source => source.utilities)
  const alerts = snapshot.sources.flatMap(source => source.alerts)
  const systems: HomeSystem[] = devices.map(device => ({ id: `provider-${device.id}`, name: device.name, detail: `${device.detail} · Updated ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(device.updatedAt))}`, status: /offline/i.test(device.status) ? 'Offline' : /attention|warning|alert/i.test(device.status) ? 'Attention' : 'Healthy', icon: /network|internet|doorbell|security/i.test(device.category) ? 'settings' : /electric/i.test(device.category) ? 'bolt' : 'home', tone: /offline|attention|warning|alert/i.test(device.status) ? 'amber' : 'green' }))
  const utilityCost = utilities.reduce((sum, item) => sum + (item.cost ?? 0), 0)
  const metrics: HomeMetric[] = [
    { label: 'Connected sources', value: `${connected.length}/${snapshot.sources.length}`, detail: stale.length ? `${stale.length} stale source${stale.length === 1 ? '' : 's'}` : 'Provider health checked', icon: 'settings', tone: connected.length ? 'green' : 'amber' },
    { label: 'Devices online', value: `${devices.filter(device => !/offline/i.test(device.status)).length}`, detail: `${devices.length} provider device${devices.length === 1 ? '' : 's'} tracked`, icon: 'home', tone: 'teal' },
    { label: 'Utility cost', value: money(utilityCost), detail: `${utilities.length} utility source${utilities.length === 1 ? '' : 's'}`, icon: 'bolt', tone: 'blue' },
    { label: 'Home alerts', value: `${alerts.length}`, detail: alerts.length ? 'Review provider alerts' : 'No provider alerts', icon: 'alert', tone: alerts.length ? 'amber' : 'green' },
  ]
  const activity: HouseholdActivity[] = alerts.slice(0, 8).map(alert => ({ id: `provider-${alert.id}`, title: alert.title, description: alert.detail, time: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(alert.timestamp)), icon: 'alert', tone: /critical|high/i.test(alert.severity) ? 'rose' : 'amber' }))
  const overall: HomeProviderStatus = connected.length ? 'connected' : stale.length ? 'stale' : snapshot.sources.every(source => source.status === 'unsupported') ? 'unsupported' : 'unavailable'
  const data: HomeData = { ...homeMockData, periodLabel: overall === 'stale' ? 'Provider data is stale' : overall === 'connected' ? 'Live household provider snapshot' : 'Household providers unavailable', metrics: metrics.length ? metrics : homeMockData.metrics, systems: systems.length ? systems : homeMockData.systems, activity: [...activity, ...homeMockData.activity].slice(0, 10) }
  return { status: overall, checkedAt: snapshot.checkedAt, data, alerts, sources: snapshot.sources }
}

export class HomeProviderService {
  getCached(): HomeProviderCache | null { return localStore.read<HomeProviderCache | null>(CACHE_KEY, null) }
  async refresh(): Promise<HomeProviderCache> {
    try {
      const response = await fetch(`${apiBase}/api/home/summary`, { credentials: 'include', headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const status: HomeProviderStatus = response.status === 401 ? 'unauthorized' : 'unavailable'
        const fallback = { status, data: homeMockData, alerts: [], sources: [], message: 'Household providers are unavailable.' } satisfies HomeProviderCache
        localStore.write(CACHE_KEY, fallback); return fallback
      }
      const mapped = mapHomeSnapshot(await response.json() as Snapshot)
      localStore.write(CACHE_KEY, mapped); return mapped
    } catch {
      const existing = this.getCached()
      if (existing) return { ...existing, status: 'stale', message: 'Using the last household provider snapshot.' }
      return { status: 'unavailable', data: homeMockData, alerts: [], sources: [], message: 'Household providers are unavailable.' }
    }
  }
}

export const homeProviderService = new HomeProviderService()
