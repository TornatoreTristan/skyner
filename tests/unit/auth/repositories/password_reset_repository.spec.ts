import { test } from '@japa/runner'
import PasswordResetRepository from '#auth/repositories/password_reset_repository'
import PasswordResetToken from '#auth/models/password_reset_token'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'

test.group('PasswordResetRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('devrait créer un nouveau token de réinitialisation', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()
    const tokenData = {
      email: 'test@example.com',
      token: 'test-token-123',
      expiresAt: DateTime.now().plus({ hours: 1 })
    }

    // Act
    const result = await repository.create(tokenData)

    // Assert
    assert.isObject(result)
    assert.equal(result.email, tokenData.email)
    assert.equal(result.token, tokenData.token)
    assert.isString(result.id)
    assert.instanceOf(result.expiresAt, DateTime)
  })

  test('devrait trouver un token par sa valeur', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()
    const token = await PasswordResetToken.create({
      email: 'test@example.com',
      token: 'unique-token-456',
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    // Act
    const result = await repository.findByToken('unique-token-456')

    // Assert
    assert.isObject(result)
    assert.equal(result?.id, token.id)
    assert.equal(result?.email, token.email)
    assert.equal(result?.token, token.token)
  })

  test('devrait retourner null pour un token inexistant', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()

    // Act
    const result = await repository.findByToken('non-existent-token')

    // Assert
    assert.isNull(result)
  })

  test('devrait marquer un token comme utilisé', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()
    const token = await PasswordResetToken.create({
      email: 'test@example.com',
      token: 'token-to-use',
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    assert.isTrue(token.usedAt === null || token.usedAt === undefined)

    // Act
    await repository.markAsUsed(token.id)

    // Assert
    const updatedToken = await PasswordResetToken.find(token.id)
    assert.isNotNull(updatedToken?.usedAt)
    assert.instanceOf(updatedToken?.usedAt, DateTime)
  })

  test('devrait supprimer les tokens expirés', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()

    // Créer des tokens expirés
    await PasswordResetToken.create({
      email: 'expired1@example.com',
      token: 'expired-1',
      expiresAt: DateTime.now().minus({ hours: 2 })
    })

    await PasswordResetToken.create({
      email: 'expired2@example.com',
      token: 'expired-2',
      expiresAt: DateTime.now().minus({ days: 1 })
    })

    // Créer un token valide
    await PasswordResetToken.create({
      email: 'valid@example.com',
      token: 'valid-token',
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    // Act
    const deletedCount = await repository.deleteExpiredTokens()

    // Assert
    assert.equal(deletedCount, 2)

    const remainingTokens = await PasswordResetToken.all()
    assert.lengthOf(remainingTokens, 1)
    assert.equal(remainingTokens[0].token, 'valid-token')
  })

  test('devrait supprimer tous les tokens pour un email donné', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()
    const email = 'user@example.com'

    // Créer plusieurs tokens pour le même email
    await PasswordResetToken.create({
      email,
      token: 'token-1',
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    await PasswordResetToken.create({
      email,
      token: 'token-2',
      expiresAt: DateTime.now().plus({ hours: 2 })
    })

    // Créer un token pour un autre email
    await PasswordResetToken.create({
      email: 'other@example.com',
      token: 'token-3',
      expiresAt: DateTime.now().plus({ hours: 1 })
    })

    // Act
    const deletedCount = await repository.deleteByEmail(email)

    // Assert
    assert.equal(deletedCount, 2)

    const remainingTokens = await PasswordResetToken.all()
    assert.lengthOf(remainingTokens, 1)
    assert.equal(remainingTokens[0].email, 'other@example.com')
  })

  test('devrait trouver tous les tokens valides pour un email', async ({ assert }) => {
    // Arrange
    const repository = new PasswordResetRepository()
    const email = 'user@example.com'

    // Créer un token valide
    const validToken = await PasswordResetToken.create({
      email,
      token: 'valid-token',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      usedAt: null
    })

    // Créer un token expiré
    await PasswordResetToken.create({
      email,
      token: 'expired-token',
      expiresAt: DateTime.now().minus({ hours: 1 }),
      usedAt: null
    })

    // Créer un token utilisé
    await PasswordResetToken.create({
      email,
      token: 'used-token',
      expiresAt: DateTime.now().plus({ hours: 1 }),
      usedAt: DateTime.now().minus({ minutes: 30 })
    })

    // Act
    const tokens = await repository.findValidByEmail(email)

    // Assert
    assert.lengthOf(tokens, 1)
    assert.equal(tokens[0].id, validToken.id)
    assert.equal(tokens[0].token, 'valid-token')
  })
})