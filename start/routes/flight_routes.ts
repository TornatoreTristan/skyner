import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const FlightsController = () => import('#flights/controllers/flights_controller')

router
  .group(() => {
    // Recherche de vols
    router.post('/flights/search', [FlightsController, 'search'])
    router.post('/destinations/:id/search', [FlightsController, 'searchForDestination'])

    // Liste des vols
    router.get('/destinations/:id/flights', [FlightsController, 'index'])
    router.get('/destinations/:id/flights/cheapest', [FlightsController, 'cheapest'])

    // Historique et statistiques
    router.get('/destinations/:id/price-history', [FlightsController, 'priceHistory'])
    router.get('/destinations/:id/price-statistics', [FlightsController, 'priceStatistics'])
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.updateSessionActivity()])
