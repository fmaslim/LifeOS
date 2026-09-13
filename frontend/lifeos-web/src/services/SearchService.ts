import type { SearchGroup } from '../models/search'
export interface SearchService { search(query: string): SearchGroup[] }
