import { DateTime } from 'luxon'
import { injectable } from 'inversify'
import UserSession from '#sessions/models/user_session'
import type { CreateSessionData, SessionData } from '#shared/types/session'

@injectable()
export default class SessionService {
  async createSession(sessionData: CreateSessionData): Promise<SessionData> {
    const now = DateTime.now()

    // Parser automatiquement le User-Agent
    const ua = sessionData.userAgent.toLowerCase()

    // Détection du type d'appareil
    let deviceType = 'desktop'
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
      deviceType = 'mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet'
    }

    // Détection de l'OS
    let os = 'Unknown'
    if (ua.includes('iphone') || ua.includes('ios')) os = 'iOS'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'

    // Détection du navigateur
    let browser = 'Unknown'
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('edg')) browser = 'Edge'

    return await UserSession.create({
      userId: sessionData.userId,
      ipAddress: sessionData.ipAddress,
      userAgent: sessionData.userAgent,
      startedAt: now,
      lastActivity: now,
      endedAt: null,
      isActive: true,
      // Données enrichies automatiquement
      deviceType,
      os,
      browser,
      // Autres champs
      referrer: sessionData.referrer || null,
      utmSource: sessionData.utmSource || null,
      utmMedium: sessionData.utmMedium || null,
      utmCampaign: sessionData.utmCampaign || null,
      country: null, // À implémenter plus tard avec géolocalisation
      city: null,
      region: null,
    })
  }

  async endSession(sessionId: string): Promise<SessionData> {
    const session = await UserSession.findOrFail(sessionId)

    session.endedAt = DateTime.now()
    session.isActive = false

    await session.save()

    return session
  }

  async findById(sessionId: string): Promise<SessionData> {
    return await UserSession.findOrFail(sessionId)
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = await UserSession.findOrFail(sessionId)
    session.lastActivity = DateTime.now()
    await session.save()
  }

  async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    return await UserSession.query()
      .where('user_id', userId)
      .where('is_active', true)
      .orderBy('last_activity', 'desc')
  }

  async endAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    await UserSession.query()
      .where('user_id', userId)
      .where('id', '!=', currentSessionId)
      .where('is_active', true)
      .update({
        ended_at: DateTime.now(),
        is_active: false,
      })
  }

  static async createSession(sessionData: CreateSessionData): Promise<SessionData> {
    const service = new SessionService()
    return service.createSession(sessionData)
  }

  static async endSession(sessionId: string): Promise<SessionData> {
    const service = new SessionService()
    return service.endSession(sessionId)
  }

  static async findById(sessionId: string): Promise<SessionData> {
    const service = new SessionService()
    return service.findById(sessionId)
  }

  static async updateActivity(sessionId: string): Promise<void> {
    const service = new SessionService()
    return service.updateActivity(sessionId)
  }

  static async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    const service = new SessionService()
    return service.getUserActiveSessions(userId)
  }

  static async endAllOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const service = new SessionService()
    return service.endAllOtherSessions(userId, currentSessionId)
  }
}
