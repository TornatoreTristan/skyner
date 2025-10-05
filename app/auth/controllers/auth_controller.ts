import type { HttpContext } from '@adonisjs/core/http'
import AuthService from '#auth/services/auth_service'
import type { LoginData } from '#shared/types/auth'
import SessionService from '#sessions/services/session_service'
import { E } from '#shared/exceptions/index'

export default class AuthController {
  async showLogin({ inertia }: HttpContext) {
    return inertia.render('auth/login')
  }

  async showRegister({ inertia }: HttpContext) {
    return inertia.render('auth/register')
  }

  async login({ request, response, session }: HttpContext) {
    // Récupérer les données du POST
    const loginData: LoginData = request.only(['email', 'password', 'remember'])

    // Utiliser AuthService pour vérifier les credentials
    const result = await AuthService.login(loginData)

    // Si l'authentification échoue, lever une exception
    if (!result.success) {
      E.invalidCredentials(result.error)
    }

    // Créer la session utilisateur
    session.put('user_id', result.user!.id)

    // Extraire les données UTM et referrer
    const utmSource = request.input('utm_source')
    const utmMedium = request.input('utm_medium')
    const utmCampaign = request.input('utm_campaign')
    const referrer = request.header('referer')

    // Créer l'entrée de session dans la base
    const userSession = await SessionService.createSession({
      userId: result.user!.id,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') || 'Unknown',
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
    })

    // Stocker l'ID de session pour pouvoir la fermer au logout
    session.put('session_id', userSession.id)

    // Réponse standardisée de succès
    return response.json({
      success: true,
      data: {
        user: {
          id: result.user!.id,
          email: result.user!.email,
        },
      },
    })
  }

  async logout({ response, session }: HttpContext) {
    const sessionId = session.get('session_id')

    if (sessionId) {
      await SessionService.endSession(sessionId)
    }

    session.forget('user_id')
    session.forget('session_id')

    return response.json({
      success: true,
      data: {
        message: 'Déconnecté avec succès',
      },
    })
  }

  async me({ response, user }: HttpContext) {
    // L'utilisateur est maintenant automatiquement chargé par le middleware auth
    // Si on arrive ici, c'est qu'il est authentifié
    E.assertUserExists(user)

    return response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
    })
  }
}
