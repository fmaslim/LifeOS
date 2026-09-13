import type { ContentGenerationResult } from '../models/content'
import '../ContentPage.css'

interface ContentPageProps {
  result: ContentGenerationResult
}

/** Presentation for a generated YouTube package, supplied by a replaceable content service. */
export function ContentPage({ result }: ContentPageProps) {
  return <div className="dashboard content-page">
    <section className="content-heading">
      <div><p className="eyebrow">Creative engine</p><h1>Content</h1><p className="subtitle">Your latest YouTube generation is ready to refine and publish.</p></div>
      <span className="generation-status"><span className="status-dot" />Generated</span>
    </section>
    <section className="content-featured panel">
      <p className="eyebrow">Video title</p>
      <h2>{result.title}</h2>
      <div className="tag-list">{result.tags.map(tag => <span className="tag" key={tag}>#{tag}</span>)}</div>
    </section>
    <div className="content-results-grid">
      <section className="panel content-section"><div className="panel-heading"><div><p className="eyebrow">Short-form script</p><h2>Script</h2></div><span className="content-count">{result.script.length} beats</span></div><ol className="script-list">{result.script.map((line, index) => <li key={line}><span>{String(index + 1).padStart(2, '0')}</span><p>{line}</p></li>)}</ol></section>
      <div className="content-side">
        <section className="panel content-section"><p className="eyebrow">YouTube description</p><h2>Description</h2><p className="content-copy">{result.description}</p></section>
        <section className="panel content-section"><p className="eyebrow">Community prompt</p><h2>Pinned comment</h2><p className="content-copy">{result.pinnedComment}</p></section>
        <section className="panel content-section"><p className="eyebrow">Image direction</p><h2>Thumbnail prompt</h2><p className="content-copy">{result.thumbnailPrompt}</p></section>
      </div>
    </div>
  </div>
}
