import { contentMockData } from '../data/contentMockData'
import type { ContentFormat, ContentGenerationRequest, ContentGenerationResult, LongContentResult, ShortContentResult } from '../models/content'
import type { ContentService } from './ContentService'

/** Frontend-only implementation; replace with an HTTP-backed ContentService when the generator API is available. */
export class MockContentService implements ContentService {
  async generateShortContent(request: ContentGenerationRequest): Promise<ShortContentResult> {
    return this.generate(request, 'short')
  }

  async generateLongContent(request: ContentGenerationRequest): Promise<LongContentResult> {
    return this.generate(request, 'long')
  }

  private async generate<TFormat extends ContentFormat>(request: ContentGenerationRequest, format: TFormat): Promise<ContentGenerationResult & { format: TFormat }> {
    const topic = request.topic.trim() || 'your next idea'
    const template = contentMockData[format]
    const replaceTopic = (value: string) => value.replaceAll('{topic}', topic)

    return { id: `mock-${format}-${Date.now()}`, format, topic, title: replaceTopic(template.title), body: replaceTopic(template.body), generatedAt: new Date().toISOString() }
  }
}
