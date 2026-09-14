import { notificationMockData } from '../data/notificationMockData'
import type { NotificationData } from '../models/notification'
import type { NotificationService } from './NotificationService'
import { InMemoryNotificationEventPublisher } from './NotificationEventService'

export class MockNotificationService implements NotificationService {
  private readonly publisher = new InMemoryNotificationEventPublisher(notificationMockData.notifications)
  constructor() {
    this.publisher.publish({ title: 'Repository checks passed', message: 'The latest LifeOS change is ready to merge.', source: 'GitHub', severity: 'normal', timestamp: new Date(Date.now() - 22 * 60_000).toISOString(), route: 'activity', deduplicationKey: 'github-checks-main-latest' })
    this.publisher.publish({ title: 'Calendar provider disconnected', message: 'Calendar signals are temporarily unavailable; other workspace data is unaffected.', source: 'Integrations', severity: 'important', timestamp: new Date(Date.now() - 51 * 60_000).toISOString(), route: 'settings', deduplicationKey: 'integration-calendar-disconnected' })
    this.publisher.publish({ title: 'System health stable', message: 'Core local services are operating normally.', source: 'System', severity: 'normal', timestamp: new Date(Date.now() - 75 * 60_000).toISOString(), route: 'dashboard', deduplicationKey: 'system-health-stable' })
    this.publisher.publish({ title: 'Automation recovered', message: 'Lead Follow-up completed after one retry for a transient provider timeout.', source: 'Automations', severity: 'important', timestamp: new Date(Date.now() - 9 * 3_600_000).toISOString(), route: 'automation-history', deduplicationKey: 'retry-lead-follow-up-17' })
  }
  publish(event: Parameters<NotificationService['publish']>[0]) { return this.publisher.publish(event) }
  getNotificationData(): NotificationData { return { notifications: this.publisher.list() } }
}
