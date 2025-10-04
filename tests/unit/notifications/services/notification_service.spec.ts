import { test } from '@japa/runner'
import NotificationService from '#notifications/services/notification_service'
import NotificationRepository from '#notifications/repositories/notification_repository'
import Notification from '#notifications/models/notification'
import User from '#users/models/user'
import Organization from '#organizations/models/organization'
import testUtils from '@adonisjs/core/services/test_utils'
import { container } from '#shared/container/container'
import { TYPES } from '#shared/container/types'

test.group('NotificationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  let user: User
  let organization: Organization
  let service: NotificationService
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
    service = new NotificationService(repository)
  })

  test('devrait créer une notification pour un utilisateur', async ({ assert }) => {
    const result = await service.createNotification({
      userId: user.id,
      organizationId: organization.id,
      type: 'user.mentioned',
      title: 'Nouvelle mention',
      message: 'Vous avez été mentionné',
    })

    assert.isObject(result)
    assert.equal(result.userId, user.id)
    assert.equal(result.type, 'user.mentioned')
    assert.equal(result.title, 'Nouvelle mention')
  })

  test('devrait créer une notification système sans organization', async ({ assert }) => {
    const result = await service.createNotification({
      userId: user.id,
      type: 'system.announcement',
      title: 'Annonce',
      message: 'Message important',
    })

    assert.isObject(result)
    assert.equal(result.userId, user.id)
    assert.isTrue(result.organizationId === null || result.organizationId === undefined)
  })

  test('devrait marquer une notification comme lue', async ({ assert }) => {
    const notification = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Message test',
    })

    await service.markAsRead(notification.id)

    const updated = await repository.findById(notification.id)
    assert.isNotNull(updated?.readAt)
  })

  test('devrait marquer plusieurs notifications comme lues', async ({ assert }) => {
    const notif1 = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test 1',
      message: 'Message 1',
    })

    const notif2 = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test 2',
      message: 'Message 2',
    })

    const count = await service.markAsReadBulk([notif1.id, notif2.id])

    assert.equal(count, 2)

    const updated1 = await repository.findById(notif1.id)
    const updated2 = await repository.findById(notif2.id)

    assert.isNotNull(updated1?.readAt)
    assert.isNotNull(updated2?.readAt)
  })

  test('devrait marquer toutes les notifications d\'un utilisateur comme lues', async ({ assert }) => {
    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test 1',
      message: 'Message 1',
    })

    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test 2',
      message: 'Message 2',
    })

    const count = await service.markAllAsReadForUser(user.id)

    assert.equal(count, 2)

    const unreadCount = await repository.countUnreadByUserId(user.id)
    assert.equal(unreadCount, 0)
  })

  test('devrait récupérer le nombre de notifications non lues', async ({ assert }) => {
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

    const count = await service.getUnreadCount(user.id)

    assert.equal(count, 2)
  })

  test('devrait récupérer les notifications d\'un utilisateur', async ({ assert }) => {
    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Notification 1',
      message: 'Message 1',
    })

    await repository.create({
      userId: user.id,
      type: 'org.invitation',
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

    const result = await service.getUserNotifications(user.id)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.isTrue(result.every((n) => n.userId === user.id))
  })

  test('devrait récupérer uniquement les notifications non lues', async ({ assert }) => {
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

    const result = await service.getUserNotifications(user.id, { unreadOnly: true })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].title, 'Unread')
  })

  test('devrait filtrer les notifications par type', async ({ assert }) => {
    await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Mention',
      message: 'You were mentioned',
    })

    await repository.create({
      userId: user.id,
      type: 'org.invitation',
      title: 'Invitation',
      message: 'You were invited',
    })

    const result = await service.getUserNotifications(user.id, {
      type: 'user.mentioned',
    })

    assert.isArray(result)
    assert.lengthOf(result, 1)
    assert.equal(result[0].type, 'user.mentioned')
  })

  test('devrait supprimer une notification', async ({ assert }) => {
    const notification = await repository.create({
      userId: user.id,
      type: 'user.mentioned',
      title: 'Test',
      message: 'Message',
    })

    await service.deleteNotification(notification.id)

    const deleted = await Notification.find(notification.id)
    assert.isNotNull(deleted?.deleted_at)
  })
})
