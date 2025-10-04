import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import NotificationRepository from '#notifications/repositories/notification_repository'

test.group('NotificationsController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let organization: Organization
  let repository: NotificationRepository

  group.each.setup(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
    })

    organization = await Organization.create({
      name: 'Test Org',
      slug: 'test-org',
    })

    repository = new NotificationRepository()
  })

  test('GET /api/notifications - should list user notifications', async ({ client }) => {
    await repository.create({
      userId: user.id,
      organizationId: organization.id,
      type: 'user.mentioned',
      title: 'Notification 1',
      message: 'Message 1',
    })

    await repository.create({
      userId: user.id,
      type: 'system.announcement',
      title: 'Notification 2',
      message: 'Message 2',
    })

    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    await repository.create({
      userId: otherUser.id,
      type: 'user.mentioned',
      title: 'Other notification',
      message: 'Other message',
    })

    const response = await client.get('/api/notifications').withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({
      notifications: [
        { title: 'Notification 1', type: 'user.mentioned' },
        { title: 'Notification 2', type: 'system.announcement' },
      ],
    })
  })

  test('GET /api/notifications?unread=true - should list only unread notifications', async ({
    client,
  }) => {
    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread',
      message: 'Unread message',
    })

    const readNotif = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Read',
      message: 'Read message',
    })

    await repository.markAsRead(readNotif.id)

    const response = await client
      .get('/api/notifications?unread=true')
      .withSession({ user_id: user.id })

    response.assertStatus(200)

    const body = response.body()
    const { notifications } = body

    if (notifications.length !== 1) {
      throw new Error(`Expected 1 notification, got ${notifications.length}`)
    }

    if (notifications[0].title !== 'Unread') {
      throw new Error(`Expected title 'Unread', got ${notifications[0].title}`)
    }
  })

  test('GET /api/notifications/unread-count - should return unread count', async ({ client }) => {
    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread 1',
      message: 'Message 1',
    })

    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread 2',
      message: 'Message 2',
    })

    const readNotif = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Read',
      message: 'Read message',
    })

    await repository.markAsRead(readNotif.id)

    const response = await client
      .get('/api/notifications/unread-count')
      .withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({ count: 2 })
  })

  test('PATCH /api/notifications/:id/read - should mark notification as read', async ({
    client,
    assert,
  }) => {
    const notification = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Test message',
    })

    const response = await client
      .patch(`/api/notifications/${notification.id}/read`)
      .withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({ success: true })

    const updated = await repository.findById(notification.id)
    assert.isNotNull(updated?.readAt)
  })

  test('PATCH /api/notifications/mark-all-read - should mark all notifications as read', async ({
    client,
    assert,
  }) => {
    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread 1',
      message: 'Message 1',
    })

    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread 2',
      message: 'Message 2',
    })

    const response = await client
      .patch('/api/notifications/mark-all-read')
      .withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({ success: true, count: 2 })

    const count = await repository.countUnreadByUserId(user.id)
    assert.equal(count, 0)
  })

  test('DELETE /api/notifications/:id - should delete notification', async ({
    client,
    assert,
  }) => {
    const notification = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Test message',
    })

    const response = await client
      .delete(`/api/notifications/${notification.id}`)
      .withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({ success: true })

    const deleted = await repository.findById(notification.id, { includeDeleted: true })
    assert.isNotNull(deleted?.deleted_at)
  })

  test('GET /api/notifications - should return 401 if not authenticated', async ({ client }) => {
    const response = await client.get('/api/notifications')

    response.assertStatus(401)
  })

  test('PATCH /api/notifications/:id/read - should return 403 if notification belongs to another user', async ({
    client,
  }) => {
    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    const notification = await repository.create({
      userId: otherUser.id,
      type: 'user.mentioned',
      title: 'Other user notification',
      message: 'Message',
    })

    const response = await client
      .patch(`/api/notifications/${notification.id}/read`)
      .withSession({ user_id: user.id })

    response.assertStatus(403)
  })
})
