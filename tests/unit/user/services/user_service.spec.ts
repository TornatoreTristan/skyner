import { test } from '@japa/runner'
import UserService from '#users/services/user_service'
import type { CreateUserData } from '#shared/types/user'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('UserService - Create User', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create a user with email and a hashed password', async ({ assert }) => {
    // Arrange - Préparer les données
    const userData: CreateUserData = {
      email: 'test@example.com',
      password: 'test',
    }

    // Act - Exécuter l'action
    const user = await UserService.create(userData)

    // Assert - Vérifier les résultats
    assert.isString(user.id)
    assert.lengthOf(user.id, 36)
    assert.match(user.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    assert.equal(user.email, 'test@example.com')
    assert.exists(user.id)
    assert.notEqual(user.password, 'test') // Le password doit être hashé
  })
})
