import type { RouteName } from './shell'
export type SearchSource = 'Tasks' | 'Goals' | 'Notes' | 'Content' | 'Automations' | 'Jarvis' | 'DocIQ' | 'Home' | 'Health' | 'Finances'
export interface SearchResult { id: string; title: string; description: string; source: SearchSource; route: RouteName; keywords: string[] }
export interface SearchGroup { source: SearchSource; results: SearchResult[] }
