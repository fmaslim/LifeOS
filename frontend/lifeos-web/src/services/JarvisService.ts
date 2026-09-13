import type { JarvisData } from '../models/jarvis'

export interface JarvisService {
  getJarvisData(): JarvisData
}
