export type JarvisActivityTone = 'violet' | 'amber' | 'green' | 'blue'

export interface JarvisMetric {
  label: string
  value: string
  detail: string
  icon: 'users' | 'send' | 'mail' | 'chart'
  tone: JarvisActivityTone
}

export interface QualifiedProspect {
  initials: string
  name: string
  company: string
  role: string
  score: number
  scoreLabel: string
}

export interface OutreachQueueItem {
  initials: string
  name: string
  company: string
  status: string
  scheduledFor: string
}

export interface JarvisActivity {
  title: string
  detail: string
  time: string
  tone: JarvisActivityTone
}

export interface JarvisData {
  status: 'Running' | 'Ready' | 'Paused'
  statusDetail: string
  lastRun: string
  nextRun: string
  metrics: JarvisMetric[]
  qualifiedProspects: QualifiedProspect[]
  outreachQueue: OutreachQueueItem[]
  activity: JarvisActivity[]
}
