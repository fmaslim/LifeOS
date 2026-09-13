import { contentGenerationMockData } from '../data/contentGenerationMockData'
import type { SearchResult, SearchSource } from '../models/search'
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
import type { SearchService } from './SearchService'

const result = (id: string, title: string, description: string, source: SearchSource, route: RouteName, keywords: string[] = []): SearchResult => ({ id, title, description, source, route, keywords })

export class MockSearchService implements SearchService {
  private readonly index: SearchResult[]
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
    this.index = [...tasks, ...goals, ...notes, ...content, ...automations, ...jarvis, ...docIQ, ...home, ...health, ...finances]
  }
  search(query: string) { const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean); if (!words.length) return []; const matches = this.index.filter(item => words.every(word => `${item.title} ${item.description} ${item.source} ${item.keywords.join(' ')}`.toLowerCase().includes(word))); return [...new Set(matches.map(item => item.source))].map(source => ({ source, results: matches.filter(item => item.source === source).slice(0, 5) })) }
}
