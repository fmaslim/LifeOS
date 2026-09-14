export type IntegrationProviderId = 'jarvis' | 'dociq' | 'youtube' | 'github' | 'calendar' | 'finance' | 'health' | 'smart-home'
export type ProviderConnectionStatus = 'not-configured' | 'connected' | 'attention' | 'unavailable'
export type ProviderHealth = 'unknown' | 'healthy' | 'degraded' | 'offline'
export type ProviderCapability = 'read' | 'write' | 'events' | 'actions'

export interface ProviderMetadata {
  id: IntegrationProviderId
  name: string
  description: string
  category: 'productivity' | 'content' | 'finance' | 'wellbeing' | 'home'
}

export interface ProviderCapabilities { read: boolean; write: boolean; events: boolean; actions: boolean }
export interface ProviderSnapshot {
  metadata: ProviderMetadata
  connection: ProviderConnectionStatus
  health: ProviderHealth
  capabilities: ProviderCapabilities
  checkedAt?: string
  message: string
}

export interface IntegrationProviderAdapter {
  readonly metadata: ProviderMetadata
  readonly capabilities: ProviderCapabilities
  getSnapshot(): ProviderSnapshot
}
