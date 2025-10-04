import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import DestinationService from '#destinations/services/destination_service'
import {
  createDestinationValidator,
  updateDestinationValidator,
} from '#destinations/validators/destination_validator'

export default class DestinationsController {
  /**
   * Liste toutes les destinations de l'utilisateur
   * GET /destinations
   */
  async index({ response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationService = getService<DestinationService>(TYPES.DestinationService)
    const destinations = await destinationService.getUserDestinations(userId)

    return response.json({ destinations })
  }

  /**
   * Affiche le détail d'une destination
   * GET /destinations/:id
   */
  async show({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = params.id
    const destinationService = getService<DestinationService>(TYPES.DestinationService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    const destination = await destinationService.getWithRelations(destinationId)

    return response.json({ destination })
  }

  /**
   * Crée une nouvelle destination
   * POST /destinations
   */
  async store({ request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const data = await request.validateUsing(createDestinationValidator)
    const destinationService = getService<DestinationService>(TYPES.DestinationService)

    const destination = await destinationService.create({
      userId,
      ...data,
      departureDate: DateTime.fromJSDate(data.departureDate).toFormat('yyyy-MM-dd'),
      returnDate: data.returnDate
        ? DateTime.fromJSDate(data.returnDate).toFormat('yyyy-MM-dd')
        : undefined,
    })

    return response.status(201).json({ destination })
  }

  /**
   * Met à jour une destination
   * PUT/PATCH /destinations/:id
   */
  async update({ params, request, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = params.id
    const data = await request.validateUsing(updateDestinationValidator)
    const destinationService = getService<DestinationService>(TYPES.DestinationService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    const destination = await destinationService.update(destinationId, {
      ...data,
      departureDate: data.departureDate
        ? DateTime.fromJSDate(data.departureDate).toFormat('yyyy-MM-dd')
        : undefined,
      returnDate: data.returnDate
        ? DateTime.fromJSDate(data.returnDate).toFormat('yyyy-MM-dd')
        : undefined,
    })

    return response.json({ destination })
  }

  /**
   * Supprime une destination
   * DELETE /destinations/:id
   */
  async destroy({ params, response, session }: HttpContext) {
    const userId = session.get('user_id')

    if (!userId) {
      return response.status(401).json({ error: 'Non authentifié' })
    }

    const destinationId = params.id
    const destinationService = getService<DestinationService>(TYPES.DestinationService)

    // Vérifier que la destination appartient à l'utilisateur
    const isOwner = await destinationService.verifyOwnership(destinationId, userId)
    if (!isOwner) {
      return response.status(403).json({ error: 'Non autorisé' })
    }

    await destinationService.delete(destinationId)

    return response.json({ success: true })
  }

}
