import type { RouteName } from './shell'
export type SearchSource = 'Tasks' | 'Goals' | 'Notes' | 'Projects' | 'Documents' | 'Activity' | 'Contacts' | 'Reading' | 'Content' | 'Automations' | 'Jarvis' | 'DocIQ' | 'Home' | 'Health' | 'Finances'
export interface SearchResult { id: string; title: string; description: string; source: SearchSource; route: RouteName; keywords: string[]; ownerId?: string; updatedAt?: string; deepLink?: string }
export interface SearchGroup { source: SearchSource; results: SearchResult[] }
export interface SearchOptions { ownerId?: string; sources?: SearchSource[]; from?: string; limit?: number; offset?: number }
export interface SearchIndexSource { id: string; read(ownerId: string): SearchResult[] }
