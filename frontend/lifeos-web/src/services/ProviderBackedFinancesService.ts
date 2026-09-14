import { financesMockData } from '../data/financesMockData'
import type { FinancesData } from '../models/finances'
import type { GoalKpi } from '../models/goal'
import type { FinancesService } from './FinancesService'
import type { ActivityService } from './ActivityService'
import type { NotificationService } from './NotificationService'
import { financeProviderService } from './FinanceProviderService'
import { localStore } from '../storage/LocalStore'
import { storageKeys } from '../storage/storageKeys'

export class ProviderBackedFinancesService implements FinancesService {
  getFinancesData(): FinancesData { return financeProviderService.getCached()?.data ?? financesMockData }
}

export function publishFinanceSignals(activity: ActivityService, notifications: NotificationService) {
  const cache = financeProviderService.getCached()
  if (!cache) return
  for (const signal of cache.signals.slice(0, 20)) {
    const important = /critical|high|warning/i.test(signal.severity)
    activity.publish({ id: `finance-${signal.id}`, timestamp: signal.timestamp, source: 'Finances', type: 'Provider signal', description: signal.detail, status: important ? 'attention' : 'info', route: 'finances', correlationId: signal.id, important })
    if (important) notifications.publish({ title: signal.title, message: signal.detail, source: 'Finances', severity: /critical/i.test(signal.severity) ? 'critical' : 'important', timestamp: signal.timestamp, route: 'finances', deduplicationKey: `finance-${signal.id}` })
  }

  const netMetric = cache.data.cashFlow.at(-1)
  if (!netMetric) return
  const net = netMetric.income - netMetric.expenses
  const existing = localStore.read<GoalKpi[]>(storageKeys.kpis, [])
  const now = new Date().toISOString().slice(0, 10)
  const kpi: GoalKpi = { id: 'finance-monthly-cash-flow', name: 'Monthly net cash flow', area: 'Finance', target: Math.max(net, 1), current: net, unit: 'USD', frequency: 'monthly', status: net >= 0 ? 'on-track' : 'at-risk', history: [{ at: now, value: net }] }
  const current = existing.find(item => item.id === kpi.id)
  if (!current) localStore.write(storageKeys.kpis, [...existing, kpi])
  else if (!current.history.some(item => item.at === now && item.value === net)) localStore.write(storageKeys.kpis, existing.map(item => item.id === kpi.id ? { ...item, current: net, status: kpi.status, history: [...item.history, { at: now, value: net }] } : item))
}
