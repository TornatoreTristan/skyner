import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import FlightSearchService from '#flights/services/flight_search_service'
import PriceHistoryService from '#flights/services/price_history_service'
import DestinationService from '#destinations/services/destination_service'
import { searchFlightsValidator } from '#flights/validators/flight_validator'

export default class FlightsController {
  /**
   * Recherche rapide de vols (sans créer de destination)
   * POST /flights/search
   */
  async search({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const data = await request.validateUsing(searchFlightsValidator)

    const flightSearchService = getService<FlightSearchService>(TYPES.FlightSearchService)

    const result = await flightSearchService.quickSearch(
      data.origin,
      data.destination,
      DateTime.fromJSDate(data.departureDate).toFormat('yyyy-MM-dd'),
      data.returnDate ? DateTime.fromJSDate(data.returnDate).toFormat('yyyy-MM-dd') : undefined,
      data.adults || 1
    )

    return response.json(result)
  }

  /**
   * Recherche des vols pour une destination existante
   * POST /destinations/:id/search
   */
  async searchForDestination({ params, request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = parseInt(params.id)
    const destinationService = getService<DestinationService>(TYPES.DestinationService)
    const flightSearchService = getService<FlightSearchService>(TYPES.FlightSearchService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    // Options de recherche (optionnelles)
    const saveToDatabase = request.input('saveToDatabase', true)
    const recordPriceHistory = request.input('recordPriceHistory', true)
    const maxResults = request.input('maxResults', 50)

    const result = await flightSearchService.searchForDestination(destinationId, {
      saveToDatabase,
      recordPriceHistory,
      maxResults,
    })

    return response.json(result)
  }

  /**
   * Liste les vols d'une destination
   * GET /destinations/:id/flights
   */
  async index({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = parseInt(params.id)
    const destinationService = getService<DestinationService>(TYPES.DestinationService)
    const flightSearchService = getService<FlightSearchService>(TYPES.FlightSearchService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    const flights = await flightSearchService.getFlightsForDestination(destinationId)

    return response.json({ flights })
  }

  /**
   * Obtient les vols les moins chers pour une destination
   * GET /destinations/:id/flights/cheapest
   */
  async cheapest({ params, request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = parseInt(params.id)
    const limit = request.input('limit', 10)

    const destinationService = getService<DestinationService>(TYPES.DestinationService)
    const flightSearchService = getService<FlightSearchService>(TYPES.FlightSearchService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    const flights = await flightSearchService.getCheapestFlights(destinationId, limit)

    return response.json({ flights })
  }

  /**
   * Obtient les statistiques de prix pour une destination
   * GET /destinations/:id/price-statistics
   */
  async priceStatistics({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = parseInt(params.id)
    const destinationService = getService<DestinationService>(TYPES.DestinationService)
    const priceHistoryService = getService<PriceHistoryService>(TYPES.PriceHistoryService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    const statistics = await priceHistoryService.getStatistics(destinationId)

    return response.json({ statistics })
  }

  /**
   * Obtient l'historique de prix pour une destination
   * GET /destinations/:id/price-history
   */
  async priceHistory({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = parseInt(params.id)
    const destinationService = getService<DestinationService>(TYPES.DestinationService)
    const priceHistoryService = getService<PriceHistoryService>(TYPES.PriceHistoryService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    const history = await priceHistoryService.getHistoryForDestination(destinationId)
    const statistics = await priceHistoryService.getStatistics(destinationId)

    return response.json({
      history,
      statistics,
    })
  }
}
