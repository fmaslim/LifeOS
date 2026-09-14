import type { DocIQData } from '../models/dociq'
import type { DashboardData } from '../models/dashboard'
import type { DocIQService } from './DocIQService'
import type { DashboardService } from './DashboardService'
import { docIQMockData } from '../data/docIQMockData'
import { dashboardMockData } from '../data/dashboardMockData'
import { docIQProviderService } from './DocIQProviderService'

export class ProviderBackedDocIQService implements DocIQService {
  getDocIQData(): DocIQData { return docIQProviderService.getCached()?.data ?? docIQMockData }
}

export class ProviderAwareDashboardService implements DashboardService {
  getDashboardData(): DashboardData {
    const cache = docIQProviderService.getCached()
    if (!cache || (cache.status !== 'connected' && cache.status !== 'stale')) return dashboardMockData
    const analyses = cache.data.metrics.find(metric => /analys/i.test(metric.label))
    const users = cache.data.metrics.find(metric => /active user/i.test(metric.label))
    return {
      ...dashboardMockData,
      docIQSummary: {
        ...dashboardMockData.docIQSummary,
        value: analyses?.value ?? users?.value ?? 'Live',
        detail: cache.status === 'stale' ? 'DocIQ provider snapshot is stale' : 'Live DocIQ provider signal',
      },
    }
  }
}
