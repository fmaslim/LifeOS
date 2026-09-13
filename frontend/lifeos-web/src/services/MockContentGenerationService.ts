import { contentGenerationMockData } from '../data/contentGenerationMockData'
import type { ContentGenerationResult } from '../models/content'
import type { ContentGenerationService } from './ContentGenerationService'

/** Frontend-only content service; replace with an API implementation when generation is connected. */
export class MockContentGenerationService implements ContentGenerationService {
  getLatestGeneration(): ContentGenerationResult {
    return contentGenerationMockData
  }
}
