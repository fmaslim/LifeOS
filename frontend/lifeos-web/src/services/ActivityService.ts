import type { ActivityData, ActivityEvent } from '../models/activity.ts'
export interface ActivityEventRepository { list(): ActivityEvent[]; publish(event: ActivityEvent): void }
export interface ActivityService { getActivityData(): ActivityData; publish(event: ActivityEvent): void }
interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export class PersistentActivityEventRepository implements ActivityEventRepository {
  private readonly storage?: KeyValueStorage; private readonly key: string; private events: ActivityEvent[]
  constructor(seed: ActivityEvent[] = [], storage?: KeyValueStorage, key = 'lifeos:activity-events') { this.storage = storage; this.key = key; this.events = this.restore(seed) }
  private restore(seed: ActivityEvent[]) { try { const parsed = JSON.parse(this.storage?.getItem(this.key) ?? 'null'); return Array.isArray(parsed) ? parsed as ActivityEvent[] : [...seed] } catch { return [...seed] } }
  publish(event: ActivityEvent) { if (this.events.some(item => item.id === event.id)) return; this.events = [event, ...this.events]; if (event.important) this.storage?.setItem(this.key, JSON.stringify(this.events.filter(item => item.important))) }
  list() { return [...this.events].sort((a,b) => b.timestamp.localeCompare(a.timestamp)) }
}
export class RepositoryActivityService implements ActivityService { private readonly repository: ActivityEventRepository; constructor(repository: ActivityEventRepository) { this.repository = repository } getActivityData() { return { events: this.repository.list() } } publish(event: ActivityEvent) { this.repository.publish(event) } }
