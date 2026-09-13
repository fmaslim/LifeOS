import { useState } from 'react'
import './ContentGenerator.css'
import { contentGeneratorMockData, type ContentField, type ContentMode } from '../data/contentGeneratorMockData'

function MockField({ field }: { field: ContentField }) {
  const inputId = `content-${field.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  return <label className={`generator-field ${field.multiline ? 'field-wide' : ''}`} htmlFor={inputId}><span>{field.label}</span>{field.multiline ? <textarea id={inputId} defaultValue={field.value} rows={field.value.includes('\n') ? 5 : 3} /> : <input id={inputId} defaultValue={field.value} />}</label>
}

/** Static generator presentation; generation and persistence are deliberately out of scope. */
export function ContentGenerator() {
  const [mode, setMode] = useState<ContentMode>('short')
  const data = contentGeneratorMockData[mode]
  return <div className="dashboard content-generator">
    <section className="generator-hero"><div><p className="eyebrow">Creative engine</p><h1>Content Generator</h1><p className="subtitle">Turn an idea into a polished brief, tailored for the way you plan to publish it.</p></div><div className="mode-switch" role="group" aria-label="Content length"><button className={mode === 'short' ? 'selected' : ''} onClick={() => setMode('short')} aria-pressed={mode === 'short'}>Short</button><button className={mode === 'long' ? 'selected' : ''} onClick={() => setMode('long')} aria-pressed={mode === 'long'}>Long</button></div></section>
    <section className="generator-intro" aria-live="polite"><div className="generator-mode-icon">{mode === 'short' ? 'S' : 'L'}</div><div><p className="eyebrow">{data.label}</p><h2>{mode === 'short' ? 'Make every second count' : 'Build a complete viewing experience'}</h2><p>{data.description}</p></div></section>
    <section className="generator-panel" aria-label={`${data.label} brief`}><div className="panel-heading"><div><p className="eyebrow">Content brief</p><h2>Start with the core idea</h2></div><span className="mock-badge">Mock draft</span></div><div className="generator-fields">{data.formFields.map(field => <MockField field={field} key={field.label} />)}</div></section>
    {data.sections.map(section => <section className="generator-panel generator-section" key={section.title}><div className="panel-heading"><div><p className="eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p className="panel-description">{section.description}</p></div></div><div className="generator-fields">{section.fields.map(field => <MockField field={field} key={field.label} />)}</div></section>)}
    <div className="generator-actions"><span>Mock fields only — nothing will be published.</span><button className="primary-button">{data.actionLabel}</button></div>
  </div>
}
