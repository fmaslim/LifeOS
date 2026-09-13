import { docIQMockData } from '../data/docIQMockData'
import type { DocIQData } from '../models/dociq'
import type { DocIQService } from './DocIQService'

/** Frontend-only DocIQ service; replace with an API implementation when available. */
export class MockDocIQService implements DocIQService { getDocIQData(): DocIQData { return docIQMockData } }
