import { jarvisMockData } from '../data/jarvisMockData.ts'
import type { JarvisData } from '../models/jarvis.ts'
import { ProviderBackedJarvisService, type JarvisProvider } from './JarvisService.ts'
export class MockLinLoopProvider implements JarvisProvider { getSnapshot(): JarvisData { return { ...jarvisMockData, fetchedAt: new Date().toISOString(), metrics: [...jarvisMockData.metrics], qualifiedProspects: [...jarvisMockData.qualifiedProspects], outreachQueue: [...jarvisMockData.outreachQueue], activity: [...jarvisMockData.activity] } } }
export class MockJarvisService extends ProviderBackedJarvisService { constructor(provider: JarvisProvider = new MockLinLoopProvider()) { super(provider) } }
