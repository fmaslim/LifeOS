import { MockActivityService } from './MockActivityService'
import { MockAutomationsService } from './MockAutomationsService'
import { MockCalendarService } from './MockCalendarService'
import { MockContentService } from './MockContentService'
import { MockDashboardService } from './MockDashboardService'
import { MockDocIQService } from './MockDocIQService'
import { MockFinancesService } from './MockFinancesService'
import { MockGoalService } from './MockGoalService'
import { MockHealthService } from './MockHealthService'
import { MockHomeService } from './MockHomeService'
import { MockJarvisService } from './MockJarvisService'
import { MockNoteService } from './MockNoteService'
import { MockNotificationService } from './MockNotificationService'
import { MockSearchService } from './MockSearchService'
import { MockSettingsService } from './MockSettingsService'
import { MockShellService } from './MockShellService'
import { MockTaskService } from './MockTaskService'
import { MockTodayService } from './MockTodayService'

/** Single composition root for swappable LifeOS domain services. */
export function createServiceRegistry() { return { activity: new MockActivityService(), automations: new MockAutomationsService(), calendar: new MockCalendarService(), content: new MockContentService(), dashboard: new MockDashboardService(), docIQ: new MockDocIQService(), finances: new MockFinancesService(), goals: new MockGoalService(), health: new MockHealthService(), home: new MockHomeService(), jarvis: new MockJarvisService(), notes: new MockNoteService(), notifications: new MockNotificationService(), search: new MockSearchService(), settings: new MockSettingsService(), shell: new MockShellService(), tasks: new MockTaskService(), today: new MockTodayService() } }
export type ServiceRegistry = ReturnType<typeof createServiceRegistry>
