import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const GoogleAuthController = () => import('#auth/controllers/google_auth_controller')

router
  .group(() => {
    router.get('/google/redirect', [GoogleAuthController, 'redirect'])
    router.get('/google/callback', [GoogleAuthController, 'callback'])
  })
  .prefix('/auth')
  .use([middleware.throttle({ maxRequests: 10, windowMs: 60000, keyPrefix: 'oauth' })])