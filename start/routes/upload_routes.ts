import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

const UploadsController = () => import('#uploads/controllers/uploads_controller')

router
  .group(() => {
    router.post('/uploads', [UploadsController, 'store'])
    router.get('/uploads', [UploadsController, 'index'])
    router.get('/uploads/:id', [UploadsController, 'show'])
    router.get('/uploads/:id/signed-url', [UploadsController, 'signedUrl'])
    router.delete('/uploads/:id', [UploadsController, 'destroy'])
  })
  .prefix('/api')
  .use([middleware.auth()])
