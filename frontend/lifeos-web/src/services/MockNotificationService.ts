import { notificationMockData } from '../data/notificationMockData'
import type { NotificationData } from '../models/notification'
import type { NotificationService } from './NotificationService'
export class MockNotificationService implements NotificationService { getNotificationData(): NotificationData { return notificationMockData } }
