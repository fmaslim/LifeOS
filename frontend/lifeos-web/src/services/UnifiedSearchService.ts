import type { SearchGroup, SearchIndexSource, SearchOptions, SearchResult } from '../models/search'
import type { SearchService } from './SearchService'

export class UnifiedSearchService implements SearchService {
  private failures: string[] = []
  constructor(privateSources: SearchIndexSource[]) { this.sources = privateSources }
  private readonly sources: SearchIndexSource[]
  search(query: string, options: SearchOptions = {}): SearchGroup[] {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return []
    const ownerId = options.ownerId ?? 'owner'; const all: SearchResult[] = []; this.failures = []
    for (const source of this.sources) { try { all.push(...source.read(ownerId).filter(item => !item.ownerId || item.ownerId === ownerId)) } catch { this.failures.push(source.id) } }
    const allowed = options.sources ? new Set(options.sources) : undefined
    const matches = all.filter(item => (!allowed || allowed.has(item.source)) && (!options.from || !item.updatedAt || item.updatedAt >= options.from) && words.every(word => `${item.title} ${item.description} ${item.source} ${item.keywords.join(' ')}`.toLowerCase().includes(word))).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.title.localeCompare(b.title))
    const offset = Math.max(0, options.offset ?? 0); const limit = Math.min(50, Math.max(1, options.limit ?? 20)); const page = matches.slice(offset, offset + limit)
    return [...new Set(page.map(item => item.source))].map(source => ({ source, results: page.filter(item => item.source === source).map(item => ({ ...item, deepLink: item.deepLink ?? `#/${item.route}` })) }))
  }
  getUnavailableSources() { return [...this.failures] }
}
