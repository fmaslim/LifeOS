import { MockActivityService } from './MockActivityService'
import { MockAutomationsService } from './MockAutomationsService'
import { MockCalendarService } from './MockCalendarService'
import { MockContentService } from './MockContentService'
import { MockGoalService } from './MockGoalService'
import { MockHealthService } from './MockHealthService'
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
import { ProviderBackedFinancesService, publishFinanceSignals } from './ProviderBackedFinancesService'
import { ProviderBackedHomeService, publishHomeSignals } from './ProviderBackedHomeService'
import { approvalService } from './ApprovalService'
import { EventAutomationService } from './EventAutomationService'
import { WebhookEventProviderService } from './WebhookEventProviderService'
import { MockKpiService } from './KpiService'
import { WeeklyReviewService } from './WeeklyReviewService'
import { createDefaultProductionHealthProbes, ProductionHealthService } from './ProductionHealthService'
import { ConfigurationDriftService, defaultConfigurationManifest, defaultRuntimeConfiguration } from './ConfigurationDriftService'
import { ReleaseService, releaseSeed } from './ReleaseService'

let activeRegistry: unknown

/** Single composition root for swappable LifeOS domain services. */
export function createServiceRegistry() {
  const services = { activity: new MockActivityService(), agentControl: new MockAgentControlService(undefined, approvalService), automationHistory: new MockAutomationHistoryService(), automations: new MockAutomationsService(), budget: new MockBudgetService(), calendar: new MockCalendarService(), contacts: new MockContactService(), content: new MockContentService(), contentPipeline: new MockContentPipelineService(), dashboard: new ProviderAwareDashboardService(), documents: new MockDocumentService(), docIQ: new ProviderBackedDocIQService(), finances: new ProviderBackedFinancesService(), github: new MockGitHubProjectService(), goals: new MockGoalService(), habits: new MockHabitService(), health: new MockHealthService(), home: new ProviderBackedHomeService(), integrationProviders: new MockIntegrationProviderService(), jarvis: new MockJarvisService(), kpis: new MockKpiService(), learning: new MockLearningService(), notes: new MockNoteService(), notifications: new MockNotificationService(), projects: new MockProjectService(), property: new MockPropertyService(), reading: new MockReadingService(), schedules: new MockScheduleService(), search: new MockSearchService(), settings: new MockSettingsService(), shell: new MockShellService(), tasks: new MockTaskService(), today: new MockTodayService(), workflowDrafts: new MockWorkflowDraftService(), approvals: approvalService }
  approvalService.attachActivity(services.activity)
  publishDocIQSignals(services.activity, services.notifications)
  publishFinanceSignals(services.activity, services.notifications)
  publishHomeSignals(services.activity, services.notifications)
  const eventAutomations = new EventAutomationService(services.automationHistory, services.activity)
  const webhookEvents = new WebhookEventProviderService()
  const weeklyReview = new WeeklyReviewService(services, approvalService)
  const configurationDrift = new ConfigurationDriftService(defaultConfigurationManifest, defaultRuntimeConfiguration, services.activity, services.notifications)
  const releases = new ReleaseService(releaseSeed, approvalService, services.activity, services.automationHistory)
  const productionHealth = new ProductionHealthService([
    ...createDefaultProductionHealthProbes(services.integrationProviders),
    { id: 'configuration', target: 'backend', label: 'Configuration drift', route: 'production-health', run: async () => { const report = configurationDrift.evaluate(); return { state: report.healthy ? 'healthy' as const : 'degraded' as const, message: report.healthy ? 'Expected configuration shape is present.' : `${report.findings.length} deterministic drift finding(s).` } } },
  ], services.activity, services.notifications, services.automationHistory)
  const dailyBrief = new CompositeDailyBriefService(services)
  const assistant = new LifeOSAssistantService({ ...services, dailyBrief, approvals: approvalService })
  const registry = { ...services, eventAutomations, webhookEvents, weeklyReview, configurationDrift, releases, productionHealth, dailyBrief, assistant }
  activeRegistry = registry
  return registry
}

/** Returns the composition root already created by the application shell. */
export function getActiveServiceRegistry() {
  if (!activeRegistry) throw new Error('LifeOS service registry has not been initialized.')
  return activeRegistry as ReturnType<typeof createServiceRegistry>
}

/** Loaded only by the scheduler runtime so Morning Autopilot does not increase the initial app bundle. */
export async function createMorningAutopilotService(services = createServiceRegistry()) {
  const { MorningAutopilotService } = await import('./MorningAutopilotService')
  return new MorningAutopilotService(services)
}
export type ServiceRegistry = ReturnType<typeof createServiceRegistry>
