import type { ContentGenerationResult } from '../models/content'

export interface ContentGenerationService {
  getLatestGeneration(): ContentGenerationResult
}
