import type { ContentGenerationRequest, LongContentResult, ShortContentResult } from '../models/content'

export type ContentProviderStatus = 'configured' | 'missing' | 'unavailable'
export interface ContentGeneratorProvider {
  getStatus(): ContentProviderStatus
  generateShort(request: ContentGenerationRequest): Promise<ShortContentResult>
  generateLong(request: ContentGenerationRequest): Promise<LongContentResult>
}

/** Contract for content generation. An HTTP-backed implementation can replace the mock without changing the page. */
export interface ContentService {
  getProviderStatus(): ContentProviderStatus
  generateShortContent(request: ContentGenerationRequest): Promise<ShortContentResult>
  generateLongContent(request: ContentGenerationRequest): Promise<LongContentResult>
}
