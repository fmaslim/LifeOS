import type { ActivityService } from './ActivityService'
import type { NotificationService } from './NotificationService'
import { docIQProviderService } from './DocIQProviderService'

export function publishDocIQSignals(activity: ActivityService, notifications: NotificationService) {
  const cache = docIQProviderService.getCached()
  if (!cache) return

  for (const item of cache.activity.slice(0, 20)) {
    const important = /critical|high|error|fail|risk/i.test(`${item.severity ?? ''} ${item.type}`)
    activity.publish({
      id: `dociq-${item.id}`,
      timestamp: item.timestamp,
      source: 'DocIQ',
      type: item.type,
      description: item.detail ?? item.title,
      status: important ? 'attention' : 'info',
      route: 'dociq',
      correlationId: item.id,
      important,
    })
    if (important) notifications.publish({
      title: item.title,
      message: item.detail ?? 'DocIQ reported an event that needs attention.',
      source: 'DocIQ',
      severity: /critical/i.test(item.severity ?? '') ? 'critical' : 'important',
      timestamp: item.timestamp,
      route: 'dociq',
      deduplicationKey: `dociq-${item.id}`,
    })
  }
}
