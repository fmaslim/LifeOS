import { homeMockData } from '../data/homeMockData'
import type { HomeData } from '../models/home'
import type { HomeService } from './HomeService'
import type { ActivityService } from './ActivityService'
import type { NotificationService } from './NotificationService'
import { homeProviderService } from './HomeProviderService'

export class ProviderBackedHomeService implements HomeService {
  getHomeData(): HomeData { return homeProviderService.getCached()?.data ?? homeMockData }
}

export function publishHomeSignals(activity: ActivityService, notifications: NotificationService) {
  const cache = homeProviderService.getCached()
  if (!cache) return
  for (const alert of cache.alerts.slice(0, 20)) {
    const important = /critical|high|warning/i.test(alert.severity)
    activity.publish({ id: `home-${alert.id}`, timestamp: alert.timestamp, source: 'Home', type: 'Household provider alert', description: alert.detail, status: important ? 'attention' : 'info', route: 'home', correlationId: alert.id, important })
    if (important) notifications.publish({ title: alert.title, message: alert.detail, source: 'Home', severity: /critical/i.test(alert.severity) ? 'critical' : 'important', timestamp: alert.timestamp, route: 'home', deduplicationKey: `home-${alert.id}` })
  }
}
