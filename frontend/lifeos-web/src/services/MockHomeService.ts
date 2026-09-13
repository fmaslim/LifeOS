import { homeMockData } from '../data/homeMockData'
import type { HomeData } from '../models/home'
import type { HomeService } from './HomeService'

/** Local mock implementation. No property, utility, or smart-home integrations are used. */
export class MockHomeService implements HomeService {
  getHomeData(): HomeData { return homeMockData }
}
