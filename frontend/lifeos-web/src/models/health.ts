export type HealthTone = 'violet' | 'green' | 'amber' | 'rose' | 'blue' | 'teal'
export type HealthIcon = 'heart' | 'bolt' | 'clock' | 'check' | 'chart' | 'refresh' | 'home' | 'arrow'

export interface HealthSummary { label: string; value: string; detail: string; progress: number; icon: HealthIcon; tone: HealthTone }
export interface DailyHabit { id: string; title: string; detail: string; completed: boolean; icon: HealthIcon; tone: HealthTone }
export interface HealthTrend { id: string; label: string; value: string; detail: string; progress: number; tone: HealthTone }
export interface HealthReminder { id: string; title: string; detail: string; time: string; kind: 'Reminder' | 'Appointment'; icon: HealthIcon; tone: HealthTone }
export interface HealthActivity { id: string; title: string; description: string; time: string; icon: HealthIcon; tone: HealthTone }

/** Complete view model for the frontend-only wellbeing workspace. */
export interface HealthData {
  dateLabel: string
  readiness: string
  summaries: HealthSummary[]
  habits: DailyHabit[]
  trends: HealthTrend[]
  reminders: HealthReminder[]
  activity: HealthActivity[]
}
