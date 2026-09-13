import { financesMockData } from '../data/financesMockData'
import type { FinancesData } from '../models/finances'
import type { FinancesService } from './FinancesService'

/** Local mock implementation. No bank, accounting, or third-party integrations are used. */
export class MockFinancesService implements FinancesService {
  getFinancesData(): FinancesData { return financesMockData }
}
