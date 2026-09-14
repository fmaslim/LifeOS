import type { LifeNotification, NotificationData, NotificationEvent } from '../models/notification'
export interface NotificationService { getNotificationData(): NotificationData; publish(event: NotificationEvent): LifeNotification }
