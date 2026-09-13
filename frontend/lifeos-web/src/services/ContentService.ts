import type { ContentGenerationRequest, LongContentResult, ShortContentResult } from '../models/content'

/** Contract for content generation. An HTTP-backed implementation can replace the mock without changing the page. */
export interface ContentService {
  generateShortContent(request: ContentGenerationRequest): Promise<ShortContentResult>
  generateLongContent(request: ContentGenerationRequest): Promise<LongContentResult>
}
