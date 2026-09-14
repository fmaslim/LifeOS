import { sanitizeDiagnostic } from '../errors/errorDiagnostics.ts'
import type { ContentPipelineData, GeneratorWorkflowEvent, PipelineItem, PipelineStage } from '../models/contentPipeline.ts'

export interface ContentPipelineService { getContentPipelineData(): ContentPipelineData; applyProviderEvent(event: GeneratorWorkflowEvent): PipelineItem; correctStage(id: string, stage: PipelineStage, reason: string): PipelineItem | undefined }
const eventStage: Record<GeneratorWorkflowEvent['state'], PipelineStage> = { generated: 'Generated', thumbnail: 'Thumbnail', pictory: 'Pictory', ready: 'Ready', published: 'Published', failed: 'Failed' }
const legacyStage: Partial<Record<PipelineStage, PipelineStage>> = { Script: 'Generated', Video: 'Pictory', Scheduled: 'Ready' }
export const normalizeStage = (stage: PipelineStage) => legacyStage[stage] ?? stage

export class InMemoryContentPipelineService implements ContentPipelineService {
  private readonly items: PipelineItem[]; private readonly eventIds = new Set<string>()
  constructor(seed: PipelineItem[] = []) { this.items = seed.map(item => ({ ...item, stage: normalizeStage(item.stage), audit: [...(item.audit ?? [])] })) }
  getContentPipelineData() { return { items: this.items.map(item => ({ ...item, audit: [...(item.audit ?? [])] })) } }
  applyProviderEvent(event: GeneratorWorkflowEvent) {
    const existing = this.items.find(item => item.id === event.jobId)
    if (this.eventIds.has(event.eventId) && existing) return existing
    this.eventIds.add(event.eventId); const nextStage = eventStage[event.state]
    if (!existing) { const created: PipelineItem = { id: event.jobId, title: event.title, format: event.format, stage: nextStage, platforms: ['YouTube'], targetDate: event.timestamp.slice(0,10), generatorRef: event.jobId, artifactRoute: event.artifactRoute, publishedUrl: event.publishUrl, errorDetails: event.errorDetails ? sanitizeDiagnostic(event.errorDetails) : undefined, audit: [{ id: event.eventId, at: event.timestamp, actor: 'provider', from: 'Idea', to: nextStage }] }; this.items.push(created); return created }
    const from = existing.stage; existing.stage = nextStage; existing.artifactRoute = event.artifactRoute ?? existing.artifactRoute; existing.publishedUrl = event.publishUrl ?? existing.publishedUrl; existing.errorDetails = event.errorDetails ? sanitizeDiagnostic(event.errorDetails) : undefined; existing.audit = [...(existing.audit ?? []), { id: event.eventId, at: event.timestamp, actor: 'provider', from, to: nextStage }]; return existing
  }
  correctStage(id: string, stage: PipelineStage, reason: string) { const item = this.items.find(candidate => candidate.id === id); if (!item) return undefined; const from = item.stage; item.stage = normalizeStage(stage); item.audit = [...(item.audit ?? []), { id: `manual-${Date.now()}`, at: new Date().toISOString(), actor: 'user', from, to: item.stage, reason }]; return item }
}

const seed: PipelineItem[] = [{id:'cp-1',title:'The $11B Telecom Lie',format:'Long',stage:'Video',platforms:['YouTube','Spotify'],targetDate:'2026-09-16',generatorRef:'Long generator output',artifactRoute:'#/content'},{id:'cp-2',title:'$9B Blood Test Collapse',format:'Short',stage:'Ready',platforms:['YouTube Shorts','Instagram','Threads'],targetDate:'2026-09-14',generatorRef:'Short generator output',artifactRoute:'#/content'},{id:'cp-3',title:'The Hidden Debt Playbook',format:'Long',stage:'Script',platforms:['YouTube','Medium'],targetDate:'2026-09-18',generatorRef:'Research notes'},{id:'cp-4',title:'HealthSouth: Tiny Lies',format:'Short',stage:'Published',platforms:['YouTube Shorts'],targetDate:'2026-09-12',publishedUrl:'https://youtube.com/'}]
export class MockContentPipelineService extends InMemoryContentPipelineService { constructor() { super(seed); this.applyProviderEvent({ eventId: 'generated-job-5', jobId: 'job-5', title: 'Build a calmer weekly review', format: 'Short', state: 'generated', timestamp: new Date().toISOString(), artifactRoute: '#/content' }); this.applyProviderEvent({ eventId: 'failed-job-6', jobId: 'job-6', title: 'Automation audit essentials', format: 'Long', state: 'failed', timestamp: new Date().toISOString(), errorDetails: 'Thumbnail provider is unavailable. Retry from Content Generator.' }) } }
