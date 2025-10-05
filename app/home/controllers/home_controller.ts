import type { HttpContext } from '@adonisjs/core/http'

export default class HomeController {
  async index({ inertia, user }: HttpContext) {
    return inertia.render('home', {
      user: {
        id: user!.id,
        email: user!.email,
        fullName: user!.fullName,
      },
    })
  }
}
