import { useState } from 'react'
import { contentGeneratorMockData } from '../data/contentGeneratorMockData'

type GeneratorMode = 'short' | 'long'

function CopyIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return <button className="copy-button" onClick={copy} aria-label={`Copy ${label}`}><CopyIcon />{copied ? 'Copied' : 'Copy'}</button>
}

function OutputSection({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return <section className="generator-output"><div className="generator-output-heading"><p>{label}</p><CopyButton value={value} label={label} /></div><div className={multiline ? 'output-value output-value-multiline' : 'output-value'}>{value}</div></section>
}

export function ContentGenerator() {
  const [mode, setMode] = useState<GeneratorMode>('long')
  const content = contentGeneratorMockData.longForm
  return <div className="dashboard generator-page"><section className="generator-header"><div><p className="eyebrow">Creative engine</p><h1>Content Generator</h1><p className="subtitle">Prepare polished, channel-ready copy from one long-form idea.</p></div><div className="mode-toggle" role="tablist" aria-label="Content format"><button className={mode === 'short' ? 'active' : ''} onClick={() => setMode('short')} role="tab" aria-selected={mode === 'short'}>Short</button><button className={mode === 'long' ? 'active' : ''} onClick={() => setMode('long')} role="tab" aria-selected={mode === 'long'}>Long</button></div></section>
    {mode === 'long' ? <div className="generator-layout"><section className="generator-platform"><div className="platform-heading"><div className="platform-mark gumroad-mark">G</div><div><p className="eyebrow">Digital product</p><h2>Gumroad</h2></div></div><div className="generator-output-list"><OutputSection label="Gumroad title" value={content.gumroadTitle} /><OutputSection label="Gumroad description" value={content.gumroadDescription} multiline /><section className="generator-output"><div className="generator-output-heading"><p>Gumroad PDF summary / outline</p><span className="placeholder-badge">Placeholder</span></div><div className="outline-placeholder">{content.gumroadPdfOutline}</div></section></div></section><section className="generator-platform"><div className="platform-heading"><div className="platform-mark spotify-mark"><span /></div><div><p className="eyebrow">Audio publishing</p><h2>Spotify</h2></div></div><div className="generator-output-list"><OutputSection label="Spotify title" value={content.spotifyTitle} /><OutputSection label="Spotify description" value={content.spotifyDescription} multiline /></div></section></div> : <section className="short-mode-empty"><p className="eyebrow">Short mode</p><h2>Short-form outputs</h2><p>Select Long to review the Gumroad and Spotify copy for this mock content brief.</p></section>}
  </div>
}
