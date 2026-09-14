import { contentMockData } from '../data/contentMockData.ts'
import type { ContentFormat, ContentGenerationRequest, ContentGenerationResult, LongContentResult, ShortContentResult } from '../models/content.ts'
import type { ContentGeneratorProvider, ContentService } from './ContentService.ts'

export class MockYouTubeGeneratorProvider implements ContentGeneratorProvider {
  getStatus() { return 'configured' as const }
  generateShort(request: ContentGenerationRequest) { return Promise.resolve(this.generate(request, 'short')) }
  generateLong(request: ContentGenerationRequest) { return Promise.resolve(this.generate(request, 'long')) }
  private generate<TFormat extends ContentFormat>(request: ContentGenerationRequest, format: TFormat): ContentGenerationResult & { format: TFormat } {
    const topic = request.topic.trim() || 'your next idea'; const template = contentMockData[format]; const replaceTopic = (value: string) => value.replaceAll('{topic}', topic); const title = replaceTopic(template.title); const script = [replaceTopic(template.body), 'Close with one practical action your audience can take today.']
    return { id: `mock-${format}-${Date.now()}`, format, topic, title, body: script.join('\n\n'), script, description: `${title} — a practical guide generated inside LifeOS.`, tags: ['lifeos', 'systems', format === 'short' ? 'shorts' : 'long form'], pinnedComment: `What is your next step with ${topic}?`, thumbnailPrompt: `Premium dark editorial thumbnail about ${topic}, high contrast, one clear focal point.`, igCaption: `${title}\n\nA calmer system starts with one repeatable step.`, threadsCaption: `${title}: start small, make it repeatable, and review what works.`, mediumContent: `# ${title}\n\n${script.join('\n\n')}`, gumroadContent: `${title}\n\nA concise downloadable playbook with steps, prompts, and a review checklist.`, workflowState: 'completed', generatedAt: new Date().toISOString() }
  }
}

/** Content UI delegates to a provider contract; this local provider performs no external calls. */
export class MockContentService implements ContentService {
  private readonly provider: ContentGeneratorProvider
  constructor(provider: ContentGeneratorProvider = new MockYouTubeGeneratorProvider()) { this.provider = provider }
  getProviderStatus() { return this.provider.getStatus() }
  generateShortContent(request: ContentGenerationRequest): Promise<ShortContentResult> { return this.provider.generateShort(request) }
  generateLongContent(request: ContentGenerationRequest): Promise<LongContentResult> { return this.provider.generateLong(request) }
}
