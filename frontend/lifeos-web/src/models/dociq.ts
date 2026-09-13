export type DocumentState = 'Processed' | 'Processing' | 'Needs review'
export type RiskSeverity = 'High' | 'Medium' | 'Low'

export interface DocIQMetric { label: string; value: string; detail: string; icon: 'files' | 'scan' | 'check' | 'alert'; tone: 'violet' | 'blue' | 'green' | 'rose' }
export interface RecentAnalysis { name: string; type: string; updatedAt: string; state: DocumentState; score: string }
export interface FlaggedRisk { title: string; document: string; severity: RiskSeverity; detail: string }
export interface DocIQAction { title: string; detail: string; action: string; icon: 'review' | 'folder' | 'upload' }
export interface SystemStatus { name: string; detail: string; status: 'Operational' | 'Monitoring' }
export interface DocIQData { updatedLabel: string; metrics: DocIQMetric[]; recentAnalyses: RecentAnalysis[]; risks: FlaggedRisk[]; actions: DocIQAction[]; systemStatus: SystemStatus[] }
