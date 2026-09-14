import { useState } from 'react'
import type { ContentPipelineData, PipelineStage } from '../models/contentPipeline'
import { normalizeStage } from '../services/ContentPipelineService'
import { usePersistentState } from '../storage/usePersistentState'
import './WorkspaceCollection.css'
import './ContentPipelinePage.css'
import './ContentPipelineWorkflow.css'

const stages: PipelineStage[] = ['Idea','Generated','Thumbnail','Pictory','Ready','Published','Failed']
export function ContentPipelinePage({ data }: { data: ContentPipelineData }) {
  const [items, setItems] = usePersistentState('content-pipeline', data.items); const [view, setView] = useState<'kanban'|'list'>('kanban')
  const advance = (id: string) => setItems(current => current.map(item => { if (item.id !== id) return item; const currentStage = normalizeStage(item.stage); const next = stages[Math.min(stages.length - 2, Math.max(0, stages.indexOf(currentStage) + 1))]; return { ...item, stage: next, audit: [...(item.audit ?? []), { id: `manual-${Date.now()}`, at: new Date().toISOString(), actor: 'user' as const, from: item.stage, to: next, reason: 'Manual pipeline correction' }] } }))
  const card = (item: typeof items[number]) => <article className={`pipeline-item ${normalizeStage(item.stage) === 'Failed' ? 'pipeline-failed' : ''}`} key={item.id}><span className="workspace-pill">{item.format}</span><div><h3>{item.title}</h3><p>{item.platforms.join(' · ')} · {item.targetDate}</p><p>{item.generatorRef}</p>{item.errorDetails && <p className="pipeline-error">{item.errorDetails}</p>}</div><footer><small>{normalizeStage(item.stage)} · {item.audit?.length ?? 0} changes</small><span>{item.artifactRoute && <a href={item.artifactRoute}>Artifacts</a>}{item.publishedUrl && <a href={item.publishedUrl} target="_blank" rel="noreferrer">Published</a>}{normalizeStage(item.stage) !== 'Published' && <button onClick={() => advance(item.id)}>Move next →</button>}</span></footer></article>
  return <div className="dashboard"><section className="workspace-hero"><div><p className="eyebrow">Idea to published</p><h1>Content Pipeline</h1><p className="subtitle">Provider workflow events with visible, auditable manual control.</p></div><div className="workspace-controls"><button className="primary-button" onClick={() => setView(view === 'kanban' ? 'list' : 'kanban')}>{view === 'kanban' ? 'List view' : 'Kanban view'}</button></div></section>{view === 'kanban' ? <section className="pipeline-board">{stages.map(stage => <div className="pipeline-column" key={stage}><h2>{stage} · {items.filter(item => normalizeStage(item.stage) === stage).length}</h2>{items.filter(item => normalizeStage(item.stage) === stage).map(card)}</div>)}</section> : <section className="pipeline-list">{items.map(card)}</section>}</div>
}
