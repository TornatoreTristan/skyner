import { test } from '@japa/runner'
import PasswordResetService from '#auth/services/password_reset_service'
import PasswordResetRepository from '#auth/repositories/password_reset_repository'
import UserRepository from '#users/repositories/user_repository'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'

test.group('PasswordResetService', () => {
  let service: PasswordResetService
  let passwordResetRepository: PasswordResetRepository
  let userRepository: UserRepository

  test('devrait créer un token de réinitialisation pour un email valide', async ({ assert }) => {
    // Arrange
    const email = 'user@example.com'
    const mockUser = { id: '123', email }

    // Mock des repositories
    userRepository = {
      findByEmail: async () => mockUser,
    } as any

    passwordResetRepository = {
      create: async (data: any) => ({
        id: '456',
        email: data.email,
        token: data.token,
        expiresAt: data.expiresAt,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        usedAt: null,
      }),
      deleteExpiredTokens: async () => {},
    } as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const result = await service.createPasswordResetToken(email)

    // Assert
    assert.isObject(result)
    assert.equal(result.email, email)
    assert.isString(result.token)
    assert.lengthOf(result.token, 64)
    assert.isTrue(result.expiresAt instanceof DateTime)
    assert.isTrue(result.expiresAt > DateTime.now())
  })

  test("devrait lever une exception si l'utilisateur n'existe pas", async ({ assert }) => {
    // Arrange
    const email = 'nonexistent@example.com'

    userRepository = {
      findByEmail: async () => null,
    } as any

    passwordResetRepository = {} as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act & Assert
    await assert.rejects(
      async () => await service.createPasswordResetToken(email),
      "Aucun compte n'est associé à cette adresse email"
    )
  })

  test('devrait valider un token valide', async ({ assert }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    const mockToken = {
      id: '456',
      email: 'user@example.com',
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      usedAt: null,
      isValid: () => true,
    }

    passwordResetRepository = {
      findByToken: async () => mockToken,
    } as any

    userRepository = {} as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const result = await service.validateToken(token)

    // Assert
    assert.isTrue(result.valid)
    assert.equal(result.email, 'user@example.com')
  })

  test('devrait rejeter un token expiré', async ({ assert }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    const mockToken = {
      id: '456',
      email: 'user@example.com',
      token,
      expiresAt: DateTime.now().minus({ hours: 1 }),
      usedAt: null,
      isValid: () => false,
      isExpired: () => true,
    }

    passwordResetRepository = {
      findByToken: async () => mockToken,
    } as any

    userRepository = {} as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const result = await service.validateToken(token)

    // Assert
    assert.isFalse(result.valid)
    assert.equal(result.error, 'Ce lien de réinitialisation a expiré')
  })

  test('devrait rejeter un token déjà utilisé', async ({ assert }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    const mockToken = {
      id: '456',
      email: 'user@example.com',
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      usedAt: DateTime.now().minus({ minutes: 30 }),
      isValid: () => false,
      isUsed: () => true,
    }

    passwordResetRepository = {
      findByToken: async () => mockToken,
    } as any

    userRepository = {} as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const result = await service.validateToken(token)

    // Assert
    assert.isFalse(result.valid)
    assert.equal(result.error, 'Ce lien de réinitialisation a déjà été utilisé')
  })

  test('devrait rejeter un token invalide', async ({ assert }) => {
    // Arrange
    const token = 'invalid-token'

    passwordResetRepository = {
      findByToken: async () => null,
    } as any

    userRepository = {} as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const result = await service.validateToken(token)

    // Assert
    assert.isFalse(result.valid)
    assert.equal(result.error, 'Lien de réinitialisation invalide')
  })

  test('devrait réinitialiser le mot de passe avec un token valide', async ({ assert }) => {
    // Arrange
    const token = crypto.randomBytes(32).toString('hex')
    const newPassword = 'NewPassword123!'
    const mockToken = {
      id: '456',
      email: 'user@example.com',
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
      usedAt: null,
      isValid: () => true,
    }
    const mockUser = {
      id: '123',
      email: 'user@example.com',
      password: 'old-hashed-password',
    }

    passwordResetRepository = {
      findByToken: async () => mockToken,
      markAsUsed: async () => {
        return { ...mockToken, usedAt: DateTime.now() }
      },
    } as any

    userRepository = {
      findByEmail: async () => mockUser,
      updatePassword: async (_userId: string, password: string) => {
        mockUser.password = password
        return mockUser
      },
    } as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const result = await service.resetPassword(token, newPassword)

    // Assert
    assert.isTrue(result.success)
    assert.equal(result.message, 'Votre mot de passe a été réinitialisé avec succès')
  })

  test('devrait nettoyer les tokens expirés', async ({ assert }) => {
    // Arrange
    let deletedCount = 0

    passwordResetRepository = {
      deleteExpiredTokens: async () => {
        deletedCount = 5
        return deletedCount
      },
    } as any

    userRepository = {} as any

    service = new PasswordResetService(passwordResetRepository, userRepository)

    // Act
    const count = await service.cleanupExpiredTokens()

    // Assert
    assert.equal(count, 5)
  })
})
