import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const DestinationsController = () =>
  import('#destinations/controllers/destinations_controller')

router
  .group(() => {
    // CRUD destinations
    router.get('/destinations', [DestinationsController, 'index'])
    router.post('/destinations', [DestinationsController, 'store'])
    router.get('/destinations/:id', [DestinationsController, 'show'])
    router.put('/destinations/:id', [DestinationsController, 'update'])
    router.patch('/destinations/:id', [DestinationsController, 'update'])
    router.delete('/destinations/:id', [DestinationsController, 'destroy'])
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.updateSessionActivity()])
