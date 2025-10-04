import type { HttpContext } from '@adonisjs/core/http'
import PasswordResetService from '#auth/services/password_reset_service'
import PasswordResetRepository from '#auth/repositories/password_reset_repository'
import UserRepository from '#users/repositories/user_repository'
import {
  forgotPasswordValidator,
  resetPasswordValidator
} from '#auth/validators/password_reset_validator'
import { errors } from '@vinejs/vine'

export default class PasswordResetController {
  private passwordResetService: PasswordResetService

  constructor() {
    const passwordResetRepository = new PasswordResetRepository()
    const userRepository = new UserRepository()
    this.passwordResetService = new PasswordResetService(
      passwordResetRepository,
      userRepository
    )
  }

  /**
   * Handle forgot password request
   * POST /password/forgot
   */
  async forgot({ request, response }: HttpContext) {
    try {
      // Valider les données
      const { email } = await request.validateUsing(forgotPasswordValidator)

      try {
        // Créer un token de réinitialisation
        const tokenData = await this.passwordResetService.createPasswordResetToken(email)

        // TODO: Envoyer l'email avec le lien de réinitialisation
        // Pour l'instant, on log le token en développement
        if (process.env.NODE_ENV === 'development') {
          console.log('Password reset link:', `/password/reset/${tokenData.token}`)
        }

        // Retourner toujours le même message pour des raisons de sécurité
        return response.ok({
          success: true,
          message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation'
        })
      } catch (error) {
        // Ne pas révéler si l'email existe ou non
        return response.ok({
          success: true,
          message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation'
        })
      }
    } catch (error) {
      // Erreur de validation
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          errors: error.messages.map((msg) => ({
            field: msg.field,
            message: msg.message
          }))
        })
      }

      throw error
    }
  }

  /**
   * Validate a reset token
   * GET /password/reset/:token
   */
  async validateToken({ params, response }: HttpContext) {
    const { token } = params

    const validation = await this.passwordResetService.validateToken(token)

    if (!validation.valid) {
      return response.badRequest({
        valid: false,
        error: validation.error
      })
    }

    return response.ok({
      valid: true,
      email: validation.email
    })
  }

  /**
   * Reset password with a valid token
   * POST /password/reset
   */
  async reset({ request, response }: HttpContext) {
    try {
      // Valider les données
      const { token, password } = await request.validateUsing(resetPasswordValidator)

      // Vérifier le token d'abord
      const validation = await this.passwordResetService.validateToken(token)
      if (!validation.valid) {
        return response.badRequest({
          success: false,
          error: validation.error
        })
      }

      // Réinitialiser le mot de passe
      const result = await this.passwordResetService.resetPassword(token, password)

      return response.ok(result)
    } catch (error) {
      // Erreur de validation
      if (error instanceof errors.E_VALIDATION_ERROR) {
        return response.unprocessableEntity({
          errors: error.messages.map((msg) => ({
            field: msg.field,
            message: msg.message
          }))
        })
      }

      // Erreur métier
      if (error instanceof Error) {
        return response.badRequest({
          success: false,
          error: error.message
        })
      }

      throw error
    }
  }
}