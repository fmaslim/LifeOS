import type { SearchGroup, SearchOptions } from '../models/search'
export interface SearchService { search(query: string, options?: SearchOptions): SearchGroup[] }
