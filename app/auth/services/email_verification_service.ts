import { injectable, inject } from 'inversify'
import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'
import { TYPES } from '#shared/container/types'
import { E } from '#shared/exceptions/index'
import EmailVerificationRepository from '#auth/repositories/email_verification_repository'
import UserRepository from '#users/repositories/user_repository'
import EmailService from '#mailing/services/email_service'
import EmailVerificationToken from '#auth/models/email_verification_token'
import type { VerificationType, VerificationResult } from '#auth/types/email_verification'
import getVerificationEmailHtml from '#mailing/templates/verification_email'
import getEmailChangeVerificationHtml from '#mailing/templates/email_change_verification'
import getEmailChangeNotificationHtml from '#mailing/templates/email_change_notification'

@injectable()
export default class EmailVerificationService {
  constructor(
    @inject(TYPES.EmailVerificationRepository)
    private verificationRepo: EmailVerificationRepository,
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.EmailService) private emailService: EmailService
  ) {}

  async createVerificationToken(
    userId: string,
    type: VerificationType
  ): Promise<EmailVerificationToken> {
    const user = await this.userRepo.findByIdOrFail(userId)

    const token = string.generateRandom(64)
    const expiresAt = DateTime.now().plus({ hours: 24 })

    return this.verificationRepo.create({
      userId: user.id,
      email: user.email,
      token,
      type,
      expiresAt,
    })
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    const user = await this.userRepo.findByIdOrFail(userId)

    // Supprimer les anciens tokens
    await this.verificationRepo.deleteByUserAndType(userId, 'registration')

    // Créer nouveau token
    const verificationToken = await this.createVerificationToken(userId, 'registration')

    // Construire URL
    const verificationUrl = `${env.get('APP_URL')}/auth/email/verify/${verificationToken.token}`

    // Envoyer email
    await this.emailService.send({
      to: user.email,
      subject: 'Vérifiez votre adresse email',
      html: getVerificationEmailHtml({
        userName: user.fullName || '',
        verificationUrl,
        expiresIn: '24 heures',
      }),
      tags: { category: 'email-verification', user_id: user.id },
    })
  }

  async verifyToken(token: string): Promise<VerificationResult> {
    const verificationToken = await this.verificationRepo.findByToken(token)

    if (!verificationToken) {
      return {
        success: false,
        error: 'Token invalide',
      }
    }

    if (verificationToken.isExpired) {
      return {
        success: false,
        error: 'Token expiré',
      }
    }

    if (verificationToken.isVerified) {
      return {
        success: false,
        error: 'Token déjà utilisé',
      }
    }

    // Marquer le token comme vérifié
    await this.verificationRepo.markAsVerified(verificationToken.id)

    // Marquer l'email de l'utilisateur comme vérifié
    await this.userRepo.update(verificationToken.userId, {
      emailVerifiedAt: DateTime.now(),
    })

    return {
      success: true,
      userId: verificationToken.userId,
      email: verificationToken.email,
    }
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    await this.sendVerificationEmail(userId)
  }

  async requestEmailChange(userId: string, newEmail: string, password: string): Promise<void> {
    const user = await this.userRepo.findByIdOrFail(userId)

    // Vérifier le mot de passe
    if (!user.password) {
      throw E.unauthorized('Mot de passe requis')
    }

    const isValidPassword = await hash.verify(user.password, password)
    if (!isValidPassword) {
      throw E.unauthorized('Mot de passe invalide')
    }

    // Vérifier que le nouvel email n'est pas déjà utilisé
    const existingUser = await this.userRepo.findByEmail(newEmail)
    if (existingUser && existingUser.id !== userId) {
      throw E.validationError('Cet email est déjà utilisé')
    }

    // Supprimer les anciens tokens de changement d'email
    await this.verificationRepo.deleteByUserAndType(userId, 'email_change')

    // Créer token
    const token = string.generateRandom(64)
    const expiresAt = DateTime.now().plus({ hours: 24 })

    await this.verificationRepo.create({
      userId: user.id,
      email: newEmail,
      token,
      type: 'email_change',
      expiresAt,
    })

    // Construire URL
    const verificationUrl = `${env.get('APP_URL')}/auth/email/change/verify/${token}`

    // Envoyer email au NOUVEAU email
    await this.emailService.send({
      to: newEmail,
      subject: 'Confirmez votre nouvelle adresse email',
      html: getEmailChangeVerificationHtml({
        userName: user.fullName || '',
        newEmail,
        verificationUrl,
        expiresIn: '24 heures',
      }),
      tags: { category: 'email-change-verification', user_id: user.id },
    })
  }

  async verifyEmailChange(token: string): Promise<VerificationResult> {
    const verificationToken = await this.verificationRepo.findByToken(token)

    if (!verificationToken) {
      return {
        success: false,
        error: 'Token invalide',
      }
    }

    if (verificationToken.type !== 'email_change') {
      return {
        success: false,
        error: 'Type de token invalide',
      }
    }

    if (verificationToken.isExpired) {
      return {
        success: false,
        error: 'Token expiré',
      }
    }

    if (verificationToken.isVerified) {
      return {
        success: false,
        error: 'Token déjà utilisé',
      }
    }

    const user = await this.userRepo.findByIdOrFail(verificationToken.userId)
    const oldEmail = user.email
    const newEmail = verificationToken.email

    // Marquer le token comme vérifié
    await this.verificationRepo.markAsVerified(verificationToken.id)

    // Mettre à jour l'email de l'utilisateur
    await this.userRepo.update(user.id, {
      email: newEmail,
      emailVerifiedAt: DateTime.now(),
    })

    // Envoyer notification à l'ANCIEN email
    await this.emailService.send({
      to: oldEmail,
      subject: 'Votre adresse email a été modifiée',
      html: getEmailChangeNotificationHtml({
        userName: user.fullName || '',
        oldEmail,
        newEmail,
        changeDate: DateTime.now().toFormat('dd/MM/yyyy à HH:mm'),
      }),
      tags: { category: 'email-change-notification', user_id: user.id },
    })

    return {
      success: true,
      userId: user.id,
      email: newEmail,
    }
  }
}
