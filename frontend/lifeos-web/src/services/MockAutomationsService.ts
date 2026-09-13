import { automationsMockData } from '../data/automationsMockData'
import type { AutomationsData } from '../models/automation'
import type { AutomationsService } from './AutomationsService'

/** Frontend-only automation data; replace with an API implementation when needed. */
export class MockAutomationsService implements AutomationsService { getAutomationsData(): AutomationsData { return automationsMockData } }
