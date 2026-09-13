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
