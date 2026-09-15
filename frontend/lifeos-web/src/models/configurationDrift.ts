export type ConfigurationScope = 'frontend' | 'backend'
export type DriftKind = 'missing' | 'mismatch' | 'stale-api-target' | 'route-mismatch' | 'incompatible-feature-flag'
export interface ConfigurationRequirement { name: string; scope: ConfigurationScope; required: boolean; secret: boolean; expected?: string; kind?: Exclude<DriftKind, 'missing' | 'mismatch'>; remediation: string }
export interface RuntimeConfigurationMetadata { name: string; scope: ConfigurationScope; present: boolean; safeValue?: string; observedAt?: string }
export interface ConfigurationDriftFinding { name: string; scope: ConfigurationScope; kind: DriftKind; status: 'attention'; remediation: string }
export interface ConfigurationDriftReport { checkedAt: string; healthy: boolean; findings: ConfigurationDriftFinding[]; checkedNames: string[] }
