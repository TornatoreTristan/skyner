import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const NotificationsController = () => import('#notifications/controllers/notifications_controller')

router
  .group(() => {
    router.get('/notifications', [NotificationsController, 'index'])
    router.get('/notifications/unread-count', [NotificationsController, 'unreadCount'])
    router.patch('/notifications/mark-all-read', [NotificationsController, 'markAllAsRead'])
    router.patch('/notifications/:id/read', [NotificationsController, 'markAsRead'])
    router.delete('/notifications/:id', [NotificationsController, 'destroy'])
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.updateSessionActivity()])
