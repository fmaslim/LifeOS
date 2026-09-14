import type { JarvisData } from '../models/jarvis.ts'
export interface JarvisProvider { getSnapshot(): JarvisData }
export interface JarvisService { getJarvisData(): JarvisData }
const emptyData = (connection: JarvisData['connection'], detail: string): JarvisData => ({ connection, providerName: 'LinLoop Reach', fetchedAt: new Date().toISOString(), status: 'Paused', statusDetail: detail, lastRun: 'Unavailable', nextRun: 'Unavailable', metrics: [], qualifiedProspects: [], outreachQueue: [], activity: [] })
/** Keeps provider failure and freshness policy outside the Jarvis UI. */
export class ProviderBackedJarvisService implements JarvisService {
  private readonly provider: JarvisProvider; private readonly staleAfterMs: number; private readonly now: () => number
  constructor(provider: JarvisProvider, staleAfterMs = 15 * 60_000, now = Date.now) { this.provider = provider; this.staleAfterMs = staleAfterMs; this.now = now }
  getJarvisData() { try { const snapshot = this.provider.getSnapshot(); return this.now() - Date.parse(snapshot.fetchedAt) > this.staleAfterMs ? { ...snapshot, connection: 'stale' as const, statusDetail: `${snapshot.statusDetail} · data may be stale` } : snapshot } catch { return emptyData('unavailable', 'Provider data is temporarily unavailable. LifeOS remains operational.') } }
}
