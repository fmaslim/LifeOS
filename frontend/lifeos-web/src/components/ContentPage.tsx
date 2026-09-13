import { useState } from 'react'
import './ContentPage.css'

type ContentMode = 'short' | 'long'

interface GeneratedContent {
  title: string
  script: string
  description: string
  tags: string[]
  pinnedComment: string
  thumbnailPrompt: string
}

const initialContent: GeneratedContent = {
  title: 'Your next great idea starts here',
  script: 'Choose a format, add a topic, and generate a ready-to-refine content brief. Your draft will appear here.',
  description: 'Use this space to shape concise, clear content for the audience you want to reach.',
  tags: ['#contentcreator', '#ideas', '#lifeos'],
  pinnedComment: 'What is one idea you have been meaning to share? Drop it below.',
  thumbnailPrompt: 'A clean, editorial thumbnail with room for a bold headline and a confident creator portrait.',
}

function createContent(topic: string, mode: ContentMode): GeneratedContent {
  const subject = topic.trim() || 'building a more intentional life'
  const format = mode === 'short' ? 'short-form' : 'long-form'
  return {
    title: `${mode === 'short' ? 'The simple shift that changes' : 'A practical guide to'} ${subject}`,
    script: mode === 'short'
      ? `Hook: Most people overcomplicate ${subject}.\n\nValue: Here is the one perspective that makes it easier to start today. Focus on a small, repeatable action and let consistency do the work.\n\nClose: What would your first step look like?`
      : `Introduction: Why ${subject} matters right now.\n\nPart 1: Start with the problem your audience recognizes.\n\nPart 2: Share a practical framework they can use immediately.\n\nPart 3: Show how small actions compound over time.\n\nConclusion: Invite the audience to choose one action and put it into practice today.`,
    description: `A ${format} take on ${subject}, with a simple framework you can put into action today.`,
    tags: ['#lifeos', '#personalgrowth', '#productivity', `#${subject.replace(/[^a-z0-9]+/gi, '').slice(0, 20).toLowerCase() || 'ideas'}`],
    pinnedComment: `What is your biggest takeaway about ${subject}? I would love to hear it.`,
    thumbnailPrompt: `Premium editorial YouTube thumbnail about ${subject}, dark charcoal background, violet accent lighting, bold high-contrast headline, clean modern composition, no text rendered.`,
  }
}

const resultSections: Array<{ key: keyof Omit<GeneratedContent, 'tags'>; label: string }> = [
  { key: 'title', label: 'Title' },
  { key: 'script', label: 'Script' },
  { key: 'description', label: 'Description' },
  { key: 'pinnedComment', label: 'Pinned comment' },
  { key: 'thumbnailPrompt', label: 'Thumbnail prompt' },
]

export function ContentPage() {
  const [mode, setMode] = useState<ContentMode>('short')
  const [topic, setTopic] = useState('')
  const [content, setContent] = useState<GeneratedContent>(initialContent)
  const [hasGenerated, setHasGenerated] = useState(false)

  const generate = () => {
    setContent(createContent(topic, mode))
    setHasGenerated(true)
  }

  return <div className="dashboard content-page">
    <section className="content-page-heading">
      <div><p className="eyebrow">Creative engine</p><h1>Content generator</h1><p className="subtitle">Turn a topic into a polished content brief in seconds.</p></div>
      <span className="mock-badge">Mock generator</span>
    </section>
    <section className="generator-panel" aria-label="Content generator controls">
      <div className="mode-control" aria-label="Content length">
        <button className={mode === 'short' ? 'selected' : ''} onClick={() => setMode('short')} type="button">Short</button>
        <button className={mode === 'long' ? 'selected' : ''} onClick={() => setMode('long')} type="button">Long</button>
      </div>
      <label className="topic-field">Topic
        <input value={topic} onChange={event => setTopic(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') generate() }} placeholder="e.g. Building a better morning routine" />
      </label>
      <button className="generate-button" onClick={generate} type="button">Generate content <span aria-hidden="true">→</span></button>
    </section>
    <section className="results-heading"><div><p className="eyebrow">{hasGenerated ? 'Fresh draft' : 'Your content brief'}</p><h2>Generated results</h2></div><p>{hasGenerated ? `${mode === 'short' ? 'Short' : 'Long'} format · ready to refine` : 'Start with a topic to create a draft.'}</p></section>
    <section className="content-results">
      <div className="result-stack">{resultSections.map(section => <article className={`result-card ${section.key === 'script' ? 'script-card' : ''}`} key={section.key}><p className="eyebrow">{section.label}</p><p className="result-copy">{content[section.key]}</p></article>)}</div>
      <article className="result-card tags-card"><p className="eyebrow">Tags</p><div className="tag-list">{content.tags.map(tag => <span key={tag}>{tag}</span>)}</div></article>
    </section>
  </div>
}
