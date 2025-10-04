import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import NotificationService from '#notifications/services/notification_service'
import type { NotificationType } from '#notifications/types/notification'

export default class NotificationsController {
  async index({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    const unreadOnly = request.input('unread') === 'true'
    const type = request.input('type') as NotificationType | undefined

    const notifications = await notificationService.getUserNotifications(userId, {
      unreadOnly,
      type,
    })

    return response.json({ notifications })
  }

  async unreadCount({ response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)
    const count = await notificationService.getUnreadCount(userId)

    return response.json({ count })
  }

  async markAsRead({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const notificationId = params.id

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    const notifications = await notificationService.getUserNotifications(userId)
    const notification = notifications.find((n) => n.id === notificationId)

    if (!notification) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    await notificationService.markAsRead(notificationId)

    return response.json({ success: true })
  }

  async markAllAsRead({ response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)
    const count = await notificationService.markAllAsReadForUser(userId)

    return response.json({ success: true, count })
  }

  async destroy({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const notificationId = params.id

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const notificationService = getService<NotificationService>(TYPES.NotificationService)

    const notifications = await notificationService.getUserNotifications(userId)
    const notification = notifications.find((n) => n.id === notificationId)

    if (!notification) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    await notificationService.deleteNotification(notificationId)

    return response.json({ success: true })
  }
}
