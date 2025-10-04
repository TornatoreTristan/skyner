import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import SessionService from '#sessions/services/session_service'

export default class UpdateSessionActivityMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { session } = ctx

    // Continuer avec la requête
    await next()

    // Après la requête, mettre à jour l'activité si une session existe
    const sessionId = session.get('session_id')

    if (sessionId) {
      await SessionService.updateActivity(sessionId)
    }
  }
}
