import type { FinancesData } from '../models/finances'

/** Contract for finance data; an API-backed service can implement this later. */
export interface FinancesService { getFinancesData(): FinancesData }
