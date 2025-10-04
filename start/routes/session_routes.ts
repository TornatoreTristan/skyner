import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SessionController = () => import('#sessions/controllers/session_controller')

router
  .group(() => {
    router.get('/sessions', [SessionController, 'index'])
    router.delete('/sessions/others', [SessionController, 'destroyOthers'])
    router.delete('/sessions/:id', [SessionController, 'destroy'])
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.updateSessionActivity()])
