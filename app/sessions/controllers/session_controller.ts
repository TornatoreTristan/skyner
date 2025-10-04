import type { HttpContext } from '@adonisjs/core/http'
import SessionService from '#sessions/services/session_service'

export default class SessionController {
  async index({ response, session }: HttpContext) {
    const userId = session.get('user_id')
    const currentSessionId = session.get('session_id')

    // Récupérer toutes les sessions actives de l'utilisateur
    const sessions = await SessionService.getUserActiveSessions(userId)

    // Marquer la session courante et formater les données
    const formattedSessions = sessions.map((userSession) => ({
      id: userSession.id,
      deviceType: userSession.deviceType,
      os: userSession.os,
      browser: userSession.browser,
      ipAddress: userSession.ipAddress,
      country: userSession.country,
      city: userSession.city,
      startedAt: userSession.startedAt,
      lastActivity: userSession.lastActivity,
      isCurrent: userSession.id === currentSessionId,
    }))

    return response.json({ sessions: formattedSessions })
  }

  async destroy({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')
    const sessionIdToClose = params.id

    // Vérifier que la session appartient bien à l'utilisateur connecté
    const sessionToClose = await SessionService.findById(sessionIdToClose)

    if (sessionToClose.userId !== userId) {
      return response.status(403).json({
        success: false,
        error: 'Non autorisé à fermer cette session',
      })
    }

    // Fermer la session
    await SessionService.endSession(sessionIdToClose)

    return response.json({
      success: true,
      message: 'Session fermée avec succès',
    })
  }

  async destroyOthers({ response, session }: HttpContext) {
    const userId = session.get('user_id')
    const currentSessionId = session.get('session_id')

    // Fermer toutes les sessions actives de l'utilisateur SAUF la courante
    await SessionService.endAllOtherSessions(userId, currentSessionId)

    return response.json({
      success: true,
      message: 'Toutes les autres sessions ont été fermées',
    })
  }
}
