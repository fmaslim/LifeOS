export type ContentFormat = 'short' | 'long'

export interface ContentGenerationRequest {
  topic: string
}

export interface ContentGenerationResult {
  id: string
  format: ContentFormat
  topic: string
  title: string
  body: string
  generatedAt: string
  /** Legacy mock-result fields retained while the ContentService replaces earlier static data. */
  script?: string[]
  description?: string
  tags?: string[]
  pinnedComment?: string
  thumbnailPrompt?: string
}

export interface ShortContentResult extends ContentGenerationResult {
  format: 'short'
}

export interface LongContentResult extends ContentGenerationResult {
  format: 'long'
}

export interface ContentTemplate {
  title: string
  body: string
}
