import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import UserRepository from '#users/repositories/user_repository'
import SessionService from '#sessions/services/session_service'
import type { OAuthUserData, OAuthCallbackResult } from '#shared/types/oauth'
import type User from '#users/models/user'

interface SessionContext {
  ipAddress: string
  userAgent: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  referrer?: string
}

@injectable()
export default class GoogleAuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.SessionService) private sessionService: SessionService
  ) {}

  async handleGoogleCallback(
    oauthData: OAuthUserData,
    sessionContext?: SessionContext
  ): Promise<OAuthCallbackResult> {
    let user: User | null = await this.findByGoogleId(oauthData.providerId)
    let isNewUser = false

    if (!user) {
      user = await this.userRepository.findOneBy({ email: oauthData.email })

      if (user) {
        user = await this.linkGoogleAccount(user, oauthData)
      } else {
        user = await this.createUserFromGoogle(oauthData)
        isNewUser = true
      }
    } else {
      user = await this.updateUserProfile(user, oauthData)
    }

    let sessionId: string | undefined

    if (sessionContext) {
      const session = await this.sessionService.createSession({
        userId: user.id,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        utmSource: sessionContext.utmSource,
        utmMedium: sessionContext.utmMedium,
        utmCampaign: sessionContext.utmCampaign,
        referrer: sessionContext.referrer,
      })
      sessionId = session.id
    }

    return {
      user,
      isNewUser,
      sessionId,
    }
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ googleId })
  }

  private async createUserFromGoogle(oauthData: OAuthUserData): Promise<User> {
    return this.userRepository.create({
      email: oauthData.email,
      password: null,
      googleId: oauthData.providerId,
      fullName: oauthData.name,
      avatarUrl: oauthData.avatar || null,
    })
  }

  private async linkGoogleAccount(user: User, oauthData: OAuthUserData): Promise<User> {
    return this.userRepository.update(user.id, {
      googleId: oauthData.providerId,
      fullName: oauthData.name,
      avatarUrl: oauthData.avatar || user.avatarUrl,
    })
  }

  private async updateUserProfile(user: User, oauthData: OAuthUserData): Promise<User> {
    return this.userRepository.update(user.id, {
      fullName: oauthData.name,
      avatarUrl: oauthData.avatar || user.avatarUrl,
    })
  }
}