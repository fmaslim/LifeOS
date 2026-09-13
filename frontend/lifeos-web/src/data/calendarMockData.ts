import type { CalendarData } from '../models/calendar'

const isoDate = (offset: number) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + offset); return day.toISOString().slice(0, 10) }

/** Frontend-only sample events, deliberately grouped across every LifeOS workspace. */
export const calendarMockData: CalendarData = {
  categories: {
    work: { label: 'Work', color: '#a78bfa' }, content: { label: 'Content', color: '#f59e9e' }, home: { label: 'Home', color: '#f2c879' },
    health: { label: 'Health', color: '#66d6a2' }, finance: { label: 'Finance', color: '#67b7f7' }, automation: { label: 'Automation', color: '#55d6cf' },
  },
  events: [
    { id: 'work-planning', title: 'Weekly planning', date: isoDate(0), category: 'work', allDay: false, startTime: '09:00', endTime: '09:45', description: 'Choose the few outcomes that matter this week.' },
    { id: 'automation-review', title: 'Automation health review', date: isoDate(0), category: 'automation', allDay: false, startTime: '11:00', endTime: '11:30' },
    { id: 'health-walk', title: 'Recovery walk', date: isoDate(0), category: 'health', allDay: false, startTime: '16:30', endTime: '17:15' },
    { id: 'content-batch', title: 'Content batch', date: isoDate(1), category: 'content', allDay: false, startTime: '10:00', endTime: '12:00' },
    { id: 'finance-review', title: 'Monthly cash flow', date: isoDate(2), category: 'finance', allDay: false, startTime: '14:00', endTime: '14:45' },
    { id: 'home-maintenance', title: 'Home maintenance window', date: isoDate(3), category: 'home', allDay: true, description: 'Schedule repairs and household follow-ups.' },
    { id: 'content-publish', title: 'Publish weekly newsletter', date: isoDate(4), category: 'content', allDay: true },
    { id: 'health-strength', title: 'Strength session', date: isoDate(5), category: 'health', allDay: false, startTime: '08:00', endTime: '09:00' },
    { id: 'work-review', title: 'Weekly review', date: isoDate(6), category: 'work', allDay: false, startTime: '15:00', endTime: '16:00' },
  ],
}
