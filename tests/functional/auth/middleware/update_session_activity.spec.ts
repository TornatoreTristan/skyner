import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import UserService from '#users/services/user_service'
import SessionService from '#sessions/services/session_service'
import type { CreateUserData } from '#shared/types/user'

test.group('UpdateSessionActivity Middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should update last_activity when accessing protected route', async ({ client, assert }) => {
    // Arrange - Créer utilisateur et session
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    const user = await UserService.create(userData)

    const session = await SessionService.createSession({
      userId: user.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    })

    const initialActivity = session.lastActivity

    // Attendre un peu pour voir la différence
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Act - Accéder à une route protégée avec la session
    const response = await client
      .get('/auth/me')
      .withSession({ user_id: user.id, session_id: session.id })

    // Assert
    response.assertStatus(200)

    // Récupérer la session mise à jour
    const updatedSession = await SessionService.findById(session.id)
    assert.isTrue(updatedSession.lastActivity > initialActivity)
  })
})
