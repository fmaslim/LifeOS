export type ProviderPipelineStage = 'Idea' | 'Generated' | 'Thumbnail' | 'Pictory' | 'Ready' | 'Published' | 'Failed'
export type LegacyPipelineStage = 'Script' | 'Video' | 'Scheduled' | 'Archived'
export type PipelineStage = ProviderPipelineStage | LegacyPipelineStage
export interface PipelineAuditEntry { id: string; at: string; actor: 'provider' | 'user'; from: PipelineStage; to: PipelineStage; reason?: string }
export interface PipelineItem { id: string; title: string; format: 'Short' | 'Long'; stage: PipelineStage; platforms: string[]; targetDate: string; publishedUrl?: string; generatorRef?: string; artifactRoute?: string; errorDetails?: string; audit?: PipelineAuditEntry[] }
export interface ContentPipelineData { items: PipelineItem[] }
export interface GeneratorWorkflowEvent { eventId: string; jobId: string; title: string; format: 'Short' | 'Long'; state: 'generated' | 'thumbnail' | 'pictory' | 'ready' | 'published' | 'failed'; timestamp: string; artifactRoute?: string; publishUrl?: string; errorDetails?: string }
