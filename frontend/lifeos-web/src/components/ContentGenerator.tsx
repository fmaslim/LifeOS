import { useEffect, useState } from 'react'
import './ContentGenerator.css'

type CopyTarget = 'title' | 'script' | 'description' | 'tags' | 'comment' | 'thumbnail'

interface GeneratedField { id: CopyTarget; label: string; value: string }

const generatedFields: GeneratedField[] = [
  { id: 'title', label: 'Title', value: 'The 3 Systems That Finally Got My Week Under Control' },
  { id: 'script', label: 'Script', value: 'If your week feels like a constant scramble, the problem probably is not your motivation. It is the lack of a system you can trust. Here are the three simple systems I use to protect my focus, keep the important work moving, and end each day with a clear next step.' },
  { id: 'description', label: 'Description', value: 'A simple look at the three systems that make a busy week feel lighter: a weekly reset, a daily focus list, and one trusted place for every commitment.' },
  { id: 'tags', label: 'Tags', value: '#productivity #personaldevelopment #systems #focus #weeklyplanning' },
  { id: 'comment', label: 'Pinned comment', value: 'Which system would make the biggest difference in your week right now? I would love to hear it below.' },
  { id: 'thumbnail', label: 'Thumbnail prompt', value: 'Minimal YouTube thumbnail, confident creator at a clean desk, three glowing system cards floating beside them, dark charcoal background with violet accent lighting, bold text: "GET CONTROL", cinematic, high contrast.' },
]

function CopyIcon({ copied }: { copied: boolean }) {
  return copied
    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(value); return }
  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  textArea.remove()
  if (!copied) throw new Error('Clipboard copy failed')
}

/** Frontend-only preview of generated content and its copy actions. */
export function ContentGenerator() {
  const [copiedField, setCopiedField] = useState<CopyTarget | null>(null)
  useEffect(() => {
    if (!copiedField) return
    const timeout = window.setTimeout(() => setCopiedField(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [copiedField])
  const handleCopy = async (field: GeneratedField) => {
    try { await copyToClipboard(field.value); setCopiedField(field.id) } catch { setCopiedField(null) }
  }
  return <div className="dashboard content-generator-page"><section className="content-generator-header"><div><p className="eyebrow">Creative engine</p><h1>Content Generator</h1><p className="subtitle">Your generated content is ready to refine, publish, and share.</p></div><span className="generated-status"><span className="status-dot" />Generated</span></section><section className="generator-results" aria-label="Generated content"><div className="results-heading"><div><p className="eyebrow">Generated results</p><h2>Ready to publish</h2></div><p className="copy-hint">Use the copy actions to move each piece into your workflow.</p></div><div className="generated-fields">{generatedFields.map(field => { const copied = copiedField === field.id; return <article className={`generated-field ${field.id === 'script' ? 'generated-field-wide' : ''}`} key={field.id}><div className="generated-field-heading"><h3>{field.label}</h3><button className={`copy-button ${copied ? 'copied' : ''}`} type="button" onClick={() => void handleCopy(field)} aria-label={`Copy ${field.label.toLowerCase()}`}><CopyIcon copied={copied} />{copied ? 'Copied' : 'Copy'}</button></div><p className={field.id === 'tags' ? 'generated-tags' : ''}>{field.value}</p></article> })}</div></section><p className="copy-confirmation" role="status" aria-live="polite">{copiedField ? `${generatedFields.find(field => field.id === copiedField)?.label} copied to clipboard.` : ''}</p></div>
}
