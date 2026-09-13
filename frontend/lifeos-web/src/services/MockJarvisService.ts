import { jarvisMockData } from '../data/jarvisMockData'
import type { JarvisData } from '../models/jarvis'
import type { JarvisService } from './JarvisService'

/** Frontend-only implementation; replace with an API-backed service when Jarvis is integrated. */
export class MockJarvisService implements JarvisService {
  getJarvisData(): JarvisData {
    return jarvisMockData
  }
}
