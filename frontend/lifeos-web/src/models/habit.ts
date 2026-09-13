export type HabitCadence = 'daily' | 'weekly'; export type HabitDomain = 'Health' | 'Work' | 'Home' | 'Learning' | 'Personal'
export interface Habit { id: string; title: string; cadence: HabitCadence; target: number; streak: number; completedDates: string[]; domain: HabitDomain; reminder?: string }
export interface HabitData { habits: Habit[] }
