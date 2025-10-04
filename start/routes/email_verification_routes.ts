import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const EmailVerificationController = () =>
  import('#auth/controllers/email_verification_controller')

// Routes publiques (vérification de token)
router.group(() => {
  router.get('/verify/:token', [EmailVerificationController, 'verify'])
  router.get('/change/verify/:token', [EmailVerificationController, 'verifyChange'])
}).prefix('/auth/email')

// Routes protégées (requièrent authentification)
router
  .group(() => {
    router.post('/resend', [EmailVerificationController, 'resend'])
    router.post('/change', [EmailVerificationController, 'requestChange'])
  })
  .prefix('/auth/email')
  .use([middleware.auth(), middleware.updateSessionActivity()])
