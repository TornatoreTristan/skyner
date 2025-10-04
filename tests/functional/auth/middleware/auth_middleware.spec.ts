import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'

test.group('Auth Middleware', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should allow access to protected route when authenticated', async ({ client }) => {
    // Arrange - Créer utilisateur et se connecter
    const userData: CreateUserData = {
      email: 'user@example.com',
      password: 'password123',
    }
    await UserService.create(userData)

    const loginResponse = await client.post('/auth/login').json({
      email: 'user@example.com',
      password: 'password123',
      remember: false,
    })

    // Act - Accéder à route protégée avec session active
    const protectedResponse = await client.get('/auth/me').withSession(loginResponse.session())

    // Assert
    protectedResponse.assertStatus(200)
    protectedResponse.assertBodyContains({ success: true })
  })

  test('should block access to protected route when not authenticated', async ({ client }) => {
    // Act - Accéder à route protégée sans session
    const response = await client.get('/auth/me')

    // Assert
    response.assertStatus(401)
    response.assertBodyContains({
      success: false,
      error: {
        message: 'Authentification requise',
        code: 'AUTH_FAILED',
      },
    })
  })
})
