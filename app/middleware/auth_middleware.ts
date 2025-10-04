import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import User from '#users/models/user'
import { E } from '#shared/exceptions/index'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const userId = ctx.session.get('user_id')

    // Si pas d'ID utilisateur en session, lever une exception
    if (!userId) {
      E.unauthorized('Authentification requise')
    }

    // Charger l'utilisateur depuis la base
    const user = await User.find(userId)

    // Si l'utilisateur n'existe plus, lever une exception
    E.assertUserExists(user, userId)

    // Stocker l'utilisateur dans le contexte
    ctx.user = user

    return next()
  }
}
