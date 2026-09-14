import { useEffect, useState } from 'react'
import { calendarProviderService } from './CalendarProviderService'
import type { CalendarProviderView } from './CalendarProviderService'

export function useCalendarProvider() {
  const [snapshot, setSnapshot] = useState<CalendarProviderView>(() => calendarProviderService.getCached())
  useEffect(() => {
    let active = true
    calendarProviderService.refresh().then(next => { if (active) setSnapshot(next) })
    return () => { active = false }
  }, [])
  return snapshot
}
