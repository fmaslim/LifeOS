export type CaptureKind = 'task' | 'note' | 'idea' | 'link' | 'reminder' | 'project-candidate' | 'unclassified'
export type CaptureDestination = 'tasks' | 'notes' | 'projects' | 'reading' | 'content'
export interface CaptureItem { id: string; text: string; kind: CaptureKind; capturedAt: string; source: 'command-palette' | 'inbox' | 'api'; state: 'inbox' | 'awaiting-approval' | 'moved' | 'dismissed'; suggestedDestination?: CaptureDestination; destination?: CaptureDestination; destinationId?: string; movedAt?: string }
export interface CaptureSuggestion { destination: CaptureDestination; reason: string }
export interface CaptureDestinationAdapter { move(item: CaptureItem): string }
