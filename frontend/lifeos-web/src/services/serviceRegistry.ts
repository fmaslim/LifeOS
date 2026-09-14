import { MockActivityService } from './MockActivityService'
import { MockAutomationsService } from './MockAutomationsService'
import { MockCalendarService } from './MockCalendarService'
import { MockContentService } from './MockContentService'
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
import { MockProjectService } from './MockProjectService'
import { MockHabitService } from './MockHabitService'
import { MockLearningService } from './MockLearningService'
import { MockContactService } from './MockContactService'
import { MockReadingService } from './MockReadingService'
import { MockDocumentService } from './MockDocumentService'
import { MockBudgetService } from './BudgetService'
import { MockPropertyService } from './PropertyService'
import { MockContentPipelineService } from './ContentPipelineService'
import { MockWorkflowDraftService } from './WorkflowDraftService'
import { MockIntegrationProviderService } from './IntegrationProviderService'
import { CompositeDailyBriefService } from './DailyBriefService'
import { MockScheduleService } from './ScheduleService'
import { MockAutomationHistoryService } from './AutomationHistoryService'
import { MockGitHubProjectService } from './GitHubProjectService'
import { MockAgentControlService } from './AgentControlService'
import { LifeOSAssistantService } from './AssistantService'
import { ProviderAwareDashboardService, ProviderBackedDocIQService } from './ProviderBackedDocIQService'
import { publishDocIQSignals } from './DocIQSignalBridge'

/** Single composition root for swappable LifeOS domain services. */
export function createServiceRegistry() {
  const services = { activity: new MockActivityService(), agentControl: new MockAgentControlService(), automationHistory: new MockAutomationHistoryService(), automations: new MockAutomationsService(), budget: new MockBudgetService(), calendar: new MockCalendarService(), contacts: new MockContactService(), content: new MockContentService(), contentPipeline: new MockContentPipelineService(), dashboard: new ProviderAwareDashboardService(), documents: new MockDocumentService(), docIQ: new ProviderBackedDocIQService(), finances: new MockFinancesService(), github: new MockGitHubProjectService(), goals: new MockGoalService(), habits: new MockHabitService(), health: new MockHealthService(), home: new MockHomeService(), integrationProviders: new MockIntegrationProviderService(), jarvis: new MockJarvisService(), learning: new MockLearningService(), notes: new MockNoteService(), notifications: new MockNotificationService(), projects: new MockProjectService(), property: new MockPropertyService(), reading: new MockReadingService(), schedules: new MockScheduleService(), search: new MockSearchService(), settings: new MockSettingsService(), shell: new MockShellService(), tasks: new MockTaskService(), today: new MockTodayService(), workflowDrafts: new MockWorkflowDraftService() }
  publishDocIQSignals(services.activity, services.notifications)
  const dailyBrief = new CompositeDailyBriefService(services)
  const assistant = new LifeOSAssistantService({ ...services, dailyBrief })
  return { ...services, dailyBrief, assistant }
}

/** Loaded only by the scheduler runtime so Morning Autopilot does not increase the initial app bundle. */
export async function createMorningAutopilotService(services = createServiceRegistry()) {
  const { MorningAutopilotService } = await import('./MorningAutopilotService')
  return new MorningAutopilotService(services)
}
export type ServiceRegistry = ReturnType<typeof createServiceRegistry>
