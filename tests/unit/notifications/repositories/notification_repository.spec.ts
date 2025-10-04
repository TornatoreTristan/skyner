import { test } from '@japa/runner'
import NotificationRepository from '#notifications/repositories/notification_repository'
import Notification from '#notifications/models/notification'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'

test.group('NotificationRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let organization: Organization

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
  })

  test('devrait créer une nouvelle notification', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      organizationId: organization.id,
      type: 'user.mentioned' as const,
      title: 'Vous avez été mentionné',
      message: 'John Doe vous a mentionné dans un commentaire',
      data: { commentId: '123', userId: 'abc' },
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.equal(result.userId, notificationData.userId)
    assert.equal(result.organizationId, notificationData.organizationId)
    assert.equal(result.type, notificationData.type)
    assert.equal(result.title, notificationData.title)
    assert.equal(result.message, notificationData.message)
    assert.deepEqual(result.data, notificationData.data)
    assert.isTrue(result.readAt === null || result.readAt === undefined)
    assert.isString(result.id)
  })

  test('devrait créer une notification sans organization', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notificationData = {
      userId: user.id,
      organizationId: null,
      type: 'system.announcement' as const,
      title: 'Annonce système',
      message: 'Maintenance programmée demain',
    }

    const result = await repository.create(notificationData)

    assert.isObject(result)
    assert.equal(result.userId, notificationData.userId)
    assert.isNull(result.organizationId)
  })

  test('devrait trouver une notification par ID', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      organizationId: organization.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Test message',
    })

    const result = await repository.findById(notification.id)

    assert.isObject(result)
    assert.equal(result?.id, notification.id)
    assert.equal(result?.title, notification.title)
  })

  test('devrait retourner null pour une notification inexistante', async ({ assert }) => {
    const repository = new NotificationRepository()
    const result = await repository.findById('00000000-0000-0000-0000-000000000000')

    assert.isNull(result)
  })

  test('devrait trouver toutes les notifications d\'un utilisateur', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Notification 1',
      message: 'Message 1',
    })

    await Notification.create({
      userId: user.id,
      type: 'org.invitation',
      title: 'Notification 2',
      message: 'Message 2',
    })

    const otherUser = await User.create({
      email: 'other@example.com',
      password: 'password',
    })

    await Notification.create({
      userId: otherUser.id,
      type: 'user.mentioned',
      title: 'Other notification',
      message: 'Other message',
    })

    const result = await repository.findByUserId(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.isTrue(result.every((n) => n.userId === user.id))
  })

  test('devrait marquer une notification comme lue', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Test message',
    })

    assert.isTrue(notification.readAt === null || notification.readAt === undefined)

    await repository.markAsRead(notification.id)

    const updated = await Notification.find(notification.id)
    assert.isNotNull(updated?.readAt)
    assert.instanceOf(updated?.readAt, DateTime)
  })

  test('devrait marquer plusieurs notifications comme lues', async ({ assert }) => {
    const repository = new NotificationRepository()

    const notification1 = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test 1',
      message: 'Message 1',
    })

    const notification2 = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test 2',
      message: 'Message 2',
    })

    const count = await repository.markAsReadBulk([notification1.id, notification2.id])

    assert.equal(count, 2)

    const updated1 = await Notification.find(notification1.id)
    const updated2 = await Notification.find(notification2.id)

    assert.isNotNull(updated1?.readAt)
    assert.isNotNull(updated2?.readAt)
  })

  test('devrait compter les notifications non lues d\'un utilisateur', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread 1',
      message: 'Message 1',
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread 2',
      message: 'Message 2',
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Read',
      message: 'Message read',
      readAt: DateTime.now(),
    })

    const count = await repository.countUnreadByUserId(user.id)

    assert.equal(count, 2)
  })

  test('devrait soft delete une notification', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Test message',
    })

    await repository.delete(notification.id, { soft: true })

    const deleted = await Notification.find(notification.id)
    assert.isNotNull(deleted?.deleted_at)
  })

  test('devrait restore une notification soft deleted', async ({ assert }) => {
    const repository = new NotificationRepository()
    const notification = await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Test message',
      deleted_at: DateTime.now(),
    })

    assert.isNotNull(notification.deleted_at)

    const restored = await repository.restore(notification.id)

    assert.isTrue(restored.deleted_at === null || restored.deleted_at === undefined)
  })

  test('devrait filtrer les notifications par type', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Mention',
      message: 'You were mentioned',
    })

    await Notification.create({
      userId: user.id,
      type: 'org.invitation',
      title: 'Invitation',
      message: 'You were invited',
    })

    const result = await repository.findBy({ type: 'user.mentioned' })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].type, 'user.mentioned')
  })

  test('devrait filtrer les notifications non lues', async ({ assert }) => {
    const repository = new NotificationRepository()

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Unread',
      message: 'Unread message',
    })

    await Notification.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Read',
      message: 'Read message',
      readAt: DateTime.now(),
    })

    const result = await repository.findUnreadByUserId(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].title, 'Unread')
  })
})
