import { DateTime } from 'luxon'
import PasswordResetToken from '#auth/models/password_reset_token'
import type { CreateTokenResult } from '#auth/services/password_reset_service'

export interface CreatePasswordResetTokenData {
  email: string
  token: string
  expiresAt: DateTime
}

export default class PasswordResetRepository {
  /**
   * Crée un nouveau token de réinitialisation
   */
  async create(data: CreatePasswordResetTokenData): Promise<CreateTokenResult> {
    const token = await PasswordResetToken.create(data)
    return {
      id: token.id,
      email: token.email,
      token: token.token,
      expiresAt: token.expiresAt,
    }
  }

  /**
   * Trouve un token par sa valeur
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return await PasswordResetToken.findBy('token', token)
  }

  /**
   * Marque un token comme utilisé
   */
  async markAsUsed(tokenId: string): Promise<void> {
    const token = await PasswordResetToken.findOrFail(tokenId)
    token.usedAt = DateTime.now()
    await token.save()
  }

  /**
   * Supprime tous les tokens expirés
   */
  async deleteExpiredTokens(): Promise<number> {
    // Compter d'abord les tokens à supprimer
    const toDelete = await PasswordResetToken.query()
      .where('expires_at', '<', DateTime.now().toSQL())
      .count('* as total')

    const count = Number.parseInt(toDelete[0].$extras.total)

    if (count > 0) {
      // Supprimer les tokens expirés
      await PasswordResetToken.query().where('expires_at', '<', DateTime.now().toSQL()).delete()
    }

    return count
  }

  /**
   * Supprime tous les tokens pour un email donné
   */
  async deleteByEmail(email: string): Promise<number> {
    // Compter d'abord les tokens à supprimer
    const toDelete = await PasswordResetToken.query().where('email', email).count('* as total')

    const count = Number.parseInt(toDelete[0].$extras.total)

    if (count > 0) {
      // Supprimer les tokens
      await PasswordResetToken.query().where('email', email).delete()
    }

    return count
  }

  /**
   * Trouve tous les tokens valides pour un email
   */
  async findValidByEmail(email: string): Promise<PasswordResetToken[]> {
    return await PasswordResetToken.query()
      .where('email', email)
      .where('expires_at', '>', DateTime.now().toSQL())
      .whereNull('used_at')
  }
}
