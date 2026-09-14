import type { AutomationSchedule, ScheduleCadence, ScheduleData } from '../models/automation.ts'

export interface ScheduleService { getScheduleData(): ScheduleData; upsert(schedule: AutomationSchedule): void; setEnabled(id: string, enabled: boolean): void; claimDue(id: string, now: Date): boolean; markExecution(id: string, state: AutomationSchedule['executionState']): void }

const dayMs = 86_400_000
const parts = (date: Date, timezone: string) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]))
const toUtc = (year: number, month: number, day: number, hour: number, minute: number, timezone: string) => {
  const intended = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = intended
  for (let attempt = 0; attempt < 2; attempt += 1) { const actual = parts(new Date(candidate), timezone); candidate += intended - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute) }
  return new Date(candidate)
}
const timeParts = (time: string) => time.split(':').map(Number) as [number, number]

/** Calculates the first scheduled instant strictly after `after`, honoring the stored IANA timezone. */
export function calculateNextRun(cadence: ScheduleCadence, timezone: string, after: Date) {
  const local = parts(after, timezone)
  const [hour, minute] = timeParts(cadence.time)
  for (let offset = 0; offset < 370; offset += 1) {
    const date = new Date(Date.UTC(local.year, local.month - 1, local.day) + offset * dayMs)
    const weekday = date.getUTCDay()
    const iso = date.toISOString().slice(0, 10)
    const allowed = cadence.type === 'daily' || (cadence.type === 'weekly' && cadence.weekday === weekday) || (cadence.type === 'custom' && Math.round((Date.parse(iso) - Date.parse(cadence.anchorDate)) / dayMs) % cadence.intervalDays === 0)
    if (!allowed) continue
    const candidate = toUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), hour, minute, timezone)
    if (candidate > after) return candidate.toISOString()
  }
  throw new Error('Unable to calculate the next schedule occurrence.')
}

export class InMemoryScheduleService implements ScheduleService {
  private schedules: AutomationSchedule[]
  private readonly claimed = new Set<string>()
  constructor(seed: AutomationSchedule[] = []) { this.schedules = seed.map(schedule => ({ ...schedule })) }
  getScheduleData() { return { schedules: this.schedules.map(schedule => ({ ...schedule })) } }
  upsert(schedule: AutomationSchedule) { const index = this.schedules.findIndex(item => item.id === schedule.id); if (index < 0) this.schedules.push({ ...schedule }); else this.schedules[index] = { ...schedule } }
  setEnabled(id: string, enabled: boolean) { this.schedules = this.schedules.map(schedule => schedule.id === id ? { ...schedule, enabled } : schedule) }
  markExecution(id: string, executionState: AutomationSchedule['executionState']) { this.schedules = this.schedules.map(schedule => schedule.id === id ? { ...schedule, executionState } : schedule) }
  claimDue(id: string, now: Date) {
    const schedule = this.schedules.find(item => item.id === id)
    if (!schedule || !schedule.enabled || Date.parse(schedule.nextRun) > now.getTime()) return false
    const key = `${schedule.id}:${schedule.nextRun}`
    if (this.claimed.has(key)) return false
    this.claimed.add(key)
    schedule.previousRun = schedule.nextRun
    schedule.nextRun = calculateNextRun(schedule.cadence, schedule.timezone, now)
    schedule.executionState = 'queued'
    return true
  }
}

const now = new Date()
const seed: AutomationSchedule[] = [
  { id: 'schedule-morning-brief', automationId: 'morning-brief', name: 'Morning Command Brief', enabled: true, timezone: 'America/New_York', cadence: { type: 'daily', time: '07:00' }, previousRun: new Date(now.getTime() - dayMs).toISOString(), nextRun: calculateNextRun({ type: 'daily', time: '07:00' }, 'America/New_York', now), executionState: 'idle' },
  { id: 'schedule-finance', automationId: 'weekly-finance', name: 'Weekly Finance Snapshot', enabled: true, timezone: 'America/New_York', cadence: { type: 'weekly', weekday: 5, time: '17:00' }, nextRun: calculateNextRun({ type: 'weekly', weekday: 5, time: '17:00' }, 'America/New_York', now), executionState: 'idle' },
]
export class MockScheduleService extends InMemoryScheduleService { constructor() { super(seed) } }
