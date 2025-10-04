import { injectable, inject } from 'inversify'
import NotificationRepository from '#notifications/repositories/notification_repository'
import Notification from '#notifications/models/notification'
import type { CreateNotificationData, NotificationType } from '#notifications/types/notification'
import { TYPES } from '#shared/container/types'

export interface GetNotificationsOptions {
  unreadOnly?: boolean
  type?: NotificationType
  organizationId?: string
}

@injectable()
export default class NotificationService {
  constructor(
    @inject(TYPES.NotificationRepository) private notificationRepo: NotificationRepository
  ) {}

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    return this.notificationRepo.create(data, {
      cache: { tags: ['notifications', `user_${data.userId}_notifications`] },
    })
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationRepo.markAsRead(notificationId)
  }

  async markAsReadBulk(notificationIds: string[]): Promise<number> {
    return this.notificationRepo.markAsReadBulk(notificationIds)
  }

  async markAllAsReadForUser(userId: string): Promise<number> {
    const unreadNotifications = await this.notificationRepo.findUnreadByUserId(userId)
    const notificationIds = unreadNotifications.map((n) => n.id)

    if (notificationIds.length === 0) {
      return 0
    }

    return this.notificationRepo.markAsReadBulk(notificationIds)
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.countUnreadByUserId(userId)
  }

  async getUserNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<Notification[]> {
    if (options.unreadOnly) {
      return this.notificationRepo.findUnreadByUserId(userId)
    }

    if (options.type) {
      const allNotifications = await this.notificationRepo.findByUserId(userId)
      return allNotifications.filter((n) => n.type === options.type)
    }

    return this.notificationRepo.findByUserId(userId)
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationRepo.delete(notificationId, { soft: true })
  }
}
