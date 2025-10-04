export interface CreateNotificationData {
  userId: string
  organizationId?: string | null
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any> | null
}

export interface UpdateNotificationData {
  readAt?: Date | null
}

export interface NotificationFilters {
  userId?: string
  organizationId?: string
  type?: NotificationType
  isRead?: boolean
  isUnread?: boolean
}

export type NotificationType =
  | 'user.mentioned'
  | 'org.invitation'
  | 'org.member_joined'
  | 'org.member_left'
  | 'system.announcement'
  | 'system.maintenance'

export interface NotificationData {
  [key: string]: any
}
