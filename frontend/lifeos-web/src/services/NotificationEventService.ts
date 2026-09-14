import type { LifeNotification, NotificationEvent } from '../models/notification.ts'

export interface NotificationEventPublisher { publish(event: NotificationEvent): LifeNotification; list(): LifeNotification[] }

/** Shared in-process notification inbox. External delivery channels deliberately stay outside this boundary. */
export class InMemoryNotificationEventPublisher implements NotificationEventPublisher {
  private readonly notifications: LifeNotification[]
  constructor(seed: LifeNotification[] = []) { this.notifications = [...seed] }
  publish(event: NotificationEvent) {
    const existing = this.notifications.find(item => item.deduplicationKey === event.deduplicationKey)
    if (existing) return existing
    const notification: LifeNotification = { ...event, id: `event-${event.deduplicationKey}`, read: false }
    this.notifications.push(notification)
    return notification
  }
  list() { return [...this.notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)) }
}
