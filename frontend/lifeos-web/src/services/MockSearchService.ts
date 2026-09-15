import { contentGenerationMockData } from '../data/contentGenerationMockData'
import type { SearchOptions, SearchResult, SearchSource } from '../models/search'
import type { RouteName } from '../models/shell'
import { MockAutomationsService } from './MockAutomationsService'
import { MockDocIQService } from './MockDocIQService'
import { MockFinancesService } from './MockFinancesService'
import { MockGoalService } from './MockGoalService'
import { MockHealthService } from './MockHealthService'
import { MockHomeService } from './MockHomeService'
import { MockJarvisService } from './MockJarvisService'
import { MockNoteService } from './MockNoteService'
import { MockTaskService } from './MockTaskService'
import { MockProjectService } from './MockProjectService'
import { MockDocumentService } from './MockDocumentService'
import { MockActivityService } from './MockActivityService'
import { MockContactService } from './MockContactService'
import { MockReadingService } from './MockReadingService'
import { UnifiedSearchService } from './UnifiedSearchService'
import type { SearchService } from './SearchService'

const result = (id: string, title: string, description: string, source: SearchSource, route: RouteName, keywords: string[] = []): SearchResult => ({ id, title, description, source, route, keywords })

export class MockSearchService implements SearchService {
  private readonly index: SearchResult[]
  private readonly unified: UnifiedSearchService
  constructor() {
    const tasks = new MockTaskService().getTaskData().tasks.map(item => result(item.id, item.title, `${item.domain} · ${item.status}`, 'Tasks', 'tasks', [item.priority, item.source ?? '']))
    const goals = new MockGoalService().getGoalData().goals.map(item => result(item.id, item.title, item.description, 'Goals', 'goals', [item.area, item.status, ...item.milestones.map(value => value.title)]))
    const notes = new MockNoteService().getNoteData().notes.map(item => result(item.id, item.title, item.body, 'Notes', 'notes', [item.domain, ...item.tags]))
    const automationData = new MockAutomationsService().getAutomationsData()
    const automations = Object.values(automationData).flat().map(item => result(item.id, item.name, item.description, 'Automations', 'automations', [item.status, item.schedule ?? '']))
    const jarvis = new MockJarvisService().getJarvisData().activity.map((item, index) => result(`jarvis-${index}`, item.title, item.detail, 'Jarvis', 'jarvis', [item.time]))
    const docIQ = new MockDocIQService().getDocIQData().recentAnalyses.map((item, index) => result(`dociq-${index}`, item.name, `${item.type} · ${item.state}`, 'DocIQ', 'dociq', [item.score]))
    const home = new MockHomeService().getHomeData().projects.map(item => result(item.id, item.title, item.detail, 'Home', 'home', [item.priority, item.due]))
    const health = new MockHealthService().getHealthData().reminders.map(item => result(item.id, item.title, item.detail, 'Health', 'health', [item.kind, item.time]))
    const finances = new MockFinancesService().getFinancesData().recurringBills.map(item => result(item.id, item.name, `${item.category} · ${item.amount}`, 'Finances', 'finances', [item.due]))
    const content = [result('content-latest', contentGenerationMockData.title, contentGenerationMockData.description ?? 'Generated content', 'Content', 'content', contentGenerationMockData.tags ?? [])]
    const projects = new MockProjectService().getProjectData().projects.map(item => result(item.id, item.title, item.description, 'Projects', 'projects', [item.domain, item.status]))
    const documents = new MockDocumentService().getDocumentData().documents.map(item => result(item.id, item.title, item.source, 'Documents', 'documents', [item.category, item.status, ...item.tags]))
    const activity = new MockActivityService().getActivityData().events.map(item => result(item.id, item.type, item.description, 'Activity', 'activity', [item.source, item.status]))
    const contacts = new MockContactService().getContactData().contacts.map(item => result(item.id, item.name, item.company ?? item.relationship, 'Contacts', 'contacts', [item.relationship, item.status, ...item.tags]))
    const reading = new MockReadingService().getReadingData().items.map(item => result(item.id, item.title, item.source, 'Reading', 'reading', [item.status, ...item.tags]))
    this.index = [...tasks, ...goals, ...notes, ...projects, ...documents, ...activity, ...contacts, ...reading, ...content, ...automations, ...jarvis, ...docIQ, ...home, ...health, ...finances].map(item => ({ ...item, ownerId: 'owner', deepLink: `#/${item.route}` }))
    this.unified = new UnifiedSearchService([{ id: 'local-core', read: () => this.index }])
  }
  search(query: string, options?: SearchOptions) { return this.unified.search(query, { limit: 25, ...options }) }
}
