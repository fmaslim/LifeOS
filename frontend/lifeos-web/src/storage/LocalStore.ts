export interface StoredEnvelope<T> { version: number; value: T }
export interface LocalStore { read<T>(key: string, fallback: T): T; write<T>(key: string, value: T): void; remove(key: string): void }

const PREFIX = 'lifeos:v1:'
export class BrowserLocalStore implements LocalStore {
  read<T>(key: string, fallback: T): T { try { const raw = window.localStorage.getItem(`${PREFIX}${key}`); if (!raw) return fallback; const parsed = JSON.parse(raw) as StoredEnvelope<T>; return parsed?.version === 1 && 'value' in parsed ? parsed.value : fallback } catch { return fallback } }
  write<T>(key: string, value: T) { try { const envelope: StoredEnvelope<T> = { version: 1, value }; window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(envelope)) } catch { /* Storage may be unavailable or full; the in-memory experience remains usable. */ } }
  remove(key: string) { try { window.localStorage.removeItem(`${PREFIX}${key}`) } catch { /* Safe no-op when storage is unavailable. */ } }
}

export const localStore: LocalStore = new BrowserLocalStore()
