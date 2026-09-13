import type { TodayData } from '../models/today'

/** Contract for the Today workspace; a backend adapter can implement this later. */
export interface TodayService { getTodayData(): TodayData }
