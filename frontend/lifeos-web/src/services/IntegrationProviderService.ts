import type { IntegrationProviderAdapter, ProviderCapabilities, ProviderMetadata, ProviderSnapshot } from '../models/integrationProvider.ts'

export interface IntegrationProviderService { listProviders(): ProviderSnapshot[] }

class MockProviderAdapter implements IntegrationProviderAdapter {
  readonly metadata: ProviderMetadata
  readonly capabilities: ProviderCapabilities
  constructor(metadata: ProviderMetadata, capabilities: ProviderCapabilities) { this.metadata = metadata; this.capabilities = capabilities }
  getSnapshot(): ProviderSnapshot { return { metadata: this.metadata, capabilities: this.capabilities, connection: 'not-configured', health: 'unknown', message: 'Mock adapter ready for future configuration' } }
}

const definitions: Array<[ProviderMetadata, ProviderCapabilities]> = [
  [{ id: 'jarvis', name: 'Jarvis', description: 'Assistant signals and focused workflows.', category: 'productivity' }, { read: true, write: false, events: true, actions: false }],
  [{ id: 'dociq', name: 'DocIQ', description: 'Document insights and review events.', category: 'productivity' }, { read: true, write: false, events: true, actions: false }],
  [{ id: 'youtube', name: 'YouTube', description: 'Content pipeline and channel metrics.', category: 'content' }, { read: true, write: false, events: true, actions: false }],
  [{ id: 'github', name: 'GitHub', description: 'Repository delivery health and project activity.', category: 'productivity' }, { read: true, write: false, events: true, actions: false }],
  [{ id: 'calendar', name: 'Calendar', description: 'Unified schedule availability and events.', category: 'productivity' }, { read: true, write: true, events: true, actions: false }],
  [{ id: 'finance', name: 'Finance', description: 'Read-only account and property summaries.', category: 'finance' }, { read: true, write: false, events: true, actions: false }],
  [{ id: 'health', name: 'Health', description: 'Wellbeing signals and routine history.', category: 'wellbeing' }, { read: true, write: false, events: false, actions: false }],
  [{ id: 'smart-home', name: 'Smart home', description: 'Household state and future safe actions.', category: 'home' }, { read: true, write: false, events: true, actions: false }],
]

export class MockIntegrationProviderService implements IntegrationProviderService {
  private readonly adapters = definitions.map(([metadata, capabilities]) => new MockProviderAdapter(metadata, capabilities))
  listProviders() { return this.adapters.map(adapter => adapter.getSnapshot()) }
}
