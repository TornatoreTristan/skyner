import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import PasswordResetRepository from '#auth/repositories/password_reset_repository'
import UserRepository from '#users/repositories/user_repository'
import hash from '@adonisjs/core/services/hash'

export interface CreateTokenResult {
  id: string
  email: string
  token: string
  expiresAt: DateTime
}

export interface ValidateTokenResult {
  valid: boolean
  email?: string
  error?: string
}

export interface ResetPasswordResult {
  success: boolean
  message: string
}

export default class PasswordResetService {
  constructor(
    private passwordResetRepository: PasswordResetRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Crée un token de réinitialisation pour un email donné
   */
  async createPasswordResetToken(email: string): Promise<CreateTokenResult> {
    // Vérifier que l'utilisateur existe
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new Error('Aucun compte n\'est associé à cette adresse email')
    }

    // Supprimer les anciens tokens expirés pour cet email
    await this.passwordResetRepository.deleteExpiredTokens()

    // Générer un token sécurisé
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = DateTime.now().plus({ hours: 1 })

    // Créer le token en base de données
    const passwordResetToken = await this.passwordResetRepository.create({
      email,
      token,
      expiresAt
    })

    return passwordResetToken
  }

  /**
   * Valide un token de réinitialisation
   */
  async validateToken(token: string): Promise<ValidateTokenResult> {
    const passwordResetToken = await this.passwordResetRepository.findByToken(token)

    if (!passwordResetToken) {
      return {
        valid: false,
        error: 'Lien de réinitialisation invalide'
      }
    }

    if (passwordResetToken.isExpired && passwordResetToken.isExpired()) {
      return {
        valid: false,
        error: 'Ce lien de réinitialisation a expiré'
      }
    }

    if (passwordResetToken.isUsed && passwordResetToken.isUsed()) {
      return {
        valid: false,
        error: 'Ce lien de réinitialisation a déjà été utilisé'
      }
    }

    return {
      valid: true,
      email: passwordResetToken.email
    }
  }

  /**
   * Réinitialise le mot de passe avec un token valide
   */
  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResult> {
    // Valider le token
    const validation = await this.validateToken(token)
    if (!validation.valid) {
      throw new Error(validation.error || 'Token invalide')
    }

    // Récupérer le token et l'utilisateur
    const passwordResetToken = await this.passwordResetRepository.findByToken(token)
    if (!passwordResetToken) {
      throw new Error('Token invalide')
    }

    const user = await this.userRepository.findByEmail(passwordResetToken.email)
    if (!user) {
      throw new Error('Utilisateur introuvable')
    }

    // Hasher et mettre à jour le mot de passe
    const hashedPassword = await hash.make(newPassword)
    await this.userRepository.updatePassword(user.id, hashedPassword)

    // Marquer le token comme utilisé
    await this.passwordResetRepository.markAsUsed(passwordResetToken.id)

    return {
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès'
    }
  }

  /**
   * Nettoie les tokens expirés
   */
  async cleanupExpiredTokens(): Promise<number> {
    return await this.passwordResetRepository.deleteExpiredTokens()
  }
}