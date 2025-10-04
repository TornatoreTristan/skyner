import { test } from '@japa/runner'
import UserService from '#users/services/user_service'
import AuthService from '#auth/services/auth_service'
import type { CreateUserData } from '#shared/types/user'
import type { LoginData } from '#shared/types/auth'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('AuthService - Login', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should login with valid credentials', async ({ assert }) => {
    // Arrange - Créer un utilisateur
    const userData: CreateUserData = {
      email: 'test@example.fr',
      password: 'test123',
    }
    await UserService.create(userData)

    // Act - Tenter la connexion avec LoginData
    const loginData: LoginData = {
      email: 'test@example.fr',
      password: 'test123',
      remember: false,
    }
    const result = await AuthService.login(loginData)

    // Assert - Vérifier le succès complet
    assert.isTrue(result.success)
    assert.exists(result.user)
    assert.equal(result.user?.email, 'test@example.fr')
    assert.isUndefined(result.error)
  })

  test('should fail with invalid password', async ({ assert }) => {
    // Arrange - Créer un utilisateur
    const userData: CreateUserData = {
      email: 'test@example.fr',
      password: 'test123',
    }
    await UserService.create(userData)

    // Act - Tenter avec mauvais password
    const loginData: LoginData = {
      email: 'test@example.fr',
      password: 'wrongpassword',
      remember: false,
    }
    const result = await AuthService.login(loginData)

    // Assert - Vérifier l'échec complet
    assert.isFalse(result.success)
    assert.isNull(result.user)
    assert.exists(result.error)
  })

  test('should fail with empty email', async ({ assert }) => {
    const loginData: LoginData = {
      email: '',
      password: 'test123',
      remember: false,
    }

    const result = await AuthService.login(loginData)

    assert.isFalse(result.success)
    assert.equal(result.error, 'Email requis')
  })

  test('should fail with invalid email format', async ({ assert }) => {
    const loginData: LoginData = {
      email: 'invalid-email',
      password: 'test123',
      remember: false,
    }

    const result = await AuthService.login(loginData)

    assert.isFalse(result.success)
    assert.equal(result.error, 'Format email invalide')
  })
})
