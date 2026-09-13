import { settingsMockData } from '../data/settingsMockData'
import type { SettingsData } from '../models/settings'
import type { SettingsService } from './SettingsService'

/** Local mock source for the settings workspace. It makes no network requests. */
export class MockSettingsService implements SettingsService { getSettingsData(): SettingsData { return settingsMockData } }
