import { injectable, inject } from 'inversify'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import env from '#start/env'
import { TYPES } from '#shared/container/types'
import QueueService from '#shared/services/queue_service'
import type {
  SendEmailData,
  EmailResult,
  WelcomeEmailData,
  PasswordResetEmailData,
  QueueEmailData,
} from '#mailing/types/email'

@injectable()
export default class EmailService {
  private resend: Resend

  constructor(@inject(TYPES.QueueService) private queueService: QueueService) {
    this.resend = new Resend(env.get('RESEND_API_KEY'))
  }

  async send(emailData: SendEmailData): Promise<EmailResult> {
    try {
      let html = emailData.html

      if (emailData.react) {
        html = await render(emailData.react)
      }

      const result = await this.resend.emails.send({
        from: `${env.get('EMAIL_FROM_NAME')} <${env.get('EMAIL_FROM_ADDRESS')}>`,
        to: emailData.to,
        subject: emailData.subject,
        html,
        text: emailData.text,
        reply_to: emailData.replyTo,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachments: emailData.attachments,
        tags: emailData.tags,
      } as any)

      if (result.error) {
        throw new Error(result.error.message)
      }

      return {
        id: result.data!.id,
        success: true,
      }
    } catch (error) {
      return {
        id: '',
        success: false,
        error: error.message,
      }
    }
  }

  async queue(emailData: QueueEmailData, options?: { priority?: string; delay?: number }): Promise<string> {
    const priority = this.mapPriority(options?.priority || emailData.priority)
    const delay = options?.delay || emailData.delay

    const job = await this.queueService.dispatch(
      'send-email',
      {
        emailData,
      },
      {
        queue: 'emails',
        priority,
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    )

    return job.id!.toString()
  }

  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<EmailResult> {
    const { default: WelcomeEmail } = await import('../../../inertia/emails/welcome_email.js')
    return this.send({
      to,
      subject: 'Bienvenue sur notre plateforme !',
      react: WelcomeEmail(data),
      tags: {
        category: 'welcome',
      },
    })
  }

  async sendPasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<EmailResult> {
    const { default: PasswordResetEmail } = await import(
      '../../../inertia/emails/password_reset_email.js'
    )
    return this.send({
      to,
      subject: 'Réinitialisation de votre mot de passe',
      react: PasswordResetEmail(data),
      tags: {
        category: 'password-reset',
      },
    })
  }

  async queueWelcomeEmail(to: string, data: WelcomeEmailData): Promise<string> {
    const { default: WelcomeEmail } = await import('../../../inertia/emails/welcome_email.js')
    return this.queue({
      to,
      subject: 'Bienvenue sur notre plateforme !',
      react: WelcomeEmail(data),
      tags: {
        category: 'welcome',
      },
      priority: 'normal',
    })
  }

  async queuePasswordResetEmail(to: string, data: PasswordResetEmailData): Promise<string> {
    const { default: PasswordResetEmail } = await import(
      '../../../inertia/emails/password_reset_email.js'
    )
    return this.queue({
      to,
      subject: 'Réinitialisation de votre mot de passe',
      react: PasswordResetEmail(data),
      tags: {
        category: 'password-reset',
      },
      priority: 'high',
    })
  }

  private mapPriority(priority?: string): number {
    switch (priority) {
      case 'high':
        return 1
      case 'low':
        return 3
      case 'normal':
      default:
        return 2
    }
  }
}