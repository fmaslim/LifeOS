import { useState } from 'react'
import type { ContentGenerationResult } from '../models/content'
import type { ContentService } from '../services/ContentService'

interface ContentPageProps { contentService: ContentService }

/** Content UI depends only on the service contract, not on a concrete data source. */
export function ContentPage({ contentService }: ContentPageProps) {
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<ContentGenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const generate = async (format: 'short' | 'long') => {
    setIsGenerating(true)
    try {
      const request = { topic }
      setResult(format === 'short' ? await contentService.generateShortContent(request) : await contentService.generateLongContent(request))
    } finally { setIsGenerating(false) }
  }

  return <div className="dashboard content-page"><p className="eyebrow">Creative engine</p><section className="content-hero"><div><h1>Content</h1><p className="subtitle">Turn an idea into a starting point for your next piece of content.</p></div><div className="content-form"><label htmlFor="content-topic">What do you want to create?</label><input id="content-topic" value={topic} onChange={event => setTopic(event.target.value)} placeholder="e.g. Building a morning routine" /><div className="content-actions"><button className="text-button" onClick={() => void generate('short')} disabled={isGenerating}>Generate Short</button><button className="primary-button" onClick={() => void generate('long')} disabled={isGenerating}>Generate Long</button></div></div></section>{result && <section className="content-result panel"><div className="panel-heading"><div><p className="eyebrow">Generated {result.format} content</p><h2>{result.title}</h2></div></div><p>{result.body}</p></section>}</div>
}
