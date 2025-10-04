import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import DestinationRepository from '#destinations/repositories/destination_repository'
import Destination from '#destinations/models/destination'
import { E } from '#shared/exceptions/index'

export interface CreateDestinationData {
  userId: string
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  flexibility?: number
  maxBudget?: number
  currency?: string
  adults?: number
  children?: number
  preferences?: {
    airlines?: string[]
    maxStops?: number
    cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first'
    directFlightsOnly?: boolean
  }
}

export interface UpdateDestinationData {
  origin?: string
  destination?: string
  departureDate?: string
  returnDate?: string
  flexibility?: number
  maxBudget?: number
  currency?: string
  adults?: number
  children?: number
  preferences?: {
    airlines?: string[]
    maxStops?: number
    cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first'
    directFlightsOnly?: boolean
  }
}

@injectable()
export default class DestinationService {
  constructor(
    @inject(TYPES.DestinationRepository) private destinationRepo: DestinationRepository
  ) {}

  /**
   * Créer une nouvelle destination favorite
   */
  async create(data: CreateDestinationData): Promise<Destination> {
    // Validation métier : vérifier que les codes aéroport sont valides (3 lettres)
    if (data.origin.length !== 3 || data.destination.length !== 3) {
      E.validation('Les codes aéroport doivent contenir 3 lettres (ex: CDG, NRT)')
    }

    // Validation : la date de départ ne peut pas être dans le passé
    const departureDate = new Date(data.departureDate)
    if (departureDate < new Date()) {
      E.validation('La date de départ ne peut pas être dans le passé')
    }

    // Validation : date de retour après date de départ
    if (data.returnDate) {
      const returnDate = new Date(data.returnDate)
      if (returnDate <= departureDate) {
        E.validation('La date de retour doit être après la date de départ')
      }
    }

    // Validation : nombre de passagers
    const adults = data.adults !== undefined ? data.adults : 1
    const children = data.children !== undefined ? data.children : 0
    if (adults < 1) {
      E.validation('Il doit y avoir au moins 1 adulte')
    }
    if (adults + children > 9) {
      E.validation('Maximum 9 passagers par réservation')
    }

    // Mettre à jour les valeurs validées
    data.adults = adults
    data.children = children

    return this.destinationRepo.create(data as any, {
      cache: { tags: ['destinations', `user_${data.userId}_destinations`] },
    })
  }

  /**
   * Récupérer toutes les destinations d'un utilisateur
   */
  async getUserDestinations(userId: string): Promise<Destination[]> {
    return this.destinationRepo.findActiveByUserId(userId)
  }

  /**
   * Récupérer une destination par ID
   */
  async getById(id: number): Promise<Destination> {
    const destination = await this.destinationRepo.findById(id)
    if (!destination) {
      E.notFound('Destination', id)
    }
    return destination
  }

  /**
   * Récupérer une destination avec ses vols
   */
  async getWithFlights(id: number): Promise<Destination> {
    const destination = await this.destinationRepo.findWithFlights(id)
    if (!destination) {
      E.notFound('Destination', id)
    }
    return destination
  }

  /**
   * Récupérer une destination avec son historique de prix
   */
  async getWithPriceHistory(id: number): Promise<Destination> {
    const destination = await this.destinationRepo.findWithPriceHistory(id)
    if (!destination) {
      E.notFound('Destination', id)
    }
    return destination
  }

  /**
   * Récupérer une destination avec toutes ses relations
   */
  async getWithRelations(id: number): Promise<Destination> {
    const destination = await this.destinationRepo.findWithRelations(id)
    if (!destination) {
      E.notFound('Destination', id)
    }
    return destination
  }

  /**
   * Mettre à jour une destination
   */
  async update(id: number, data: UpdateDestinationData): Promise<Destination> {
    // Validations similaires à create si nécessaire
    if (data.departureDate) {
      const departureDate = new Date(data.departureDate)
      if (departureDate < new Date()) {
        E.validation('La date de départ ne peut pas être dans le passé')
      }
    }

    if (data.returnDate && data.departureDate) {
      const returnDate = new Date(data.returnDate)
      const departureDate = new Date(data.departureDate)
      if (returnDate <= departureDate) {
        E.validation('La date de retour doit être après la date de départ')
      }
    }

    const destination = await this.destinationRepo.findByIdOrFail(id)

    return this.destinationRepo.update(id, data as any, {
      cache: { tags: ['destinations', `destination_${id}`, `user_${destination.userId}_destinations`] },
    })
  }

  /**
   * Supprimer une destination (soft delete)
   */
  async delete(id: number): Promise<void> {
    const destination = await this.destinationRepo.findByIdOrFail(id)

    await this.destinationRepo.delete(id, {
      soft: true,
      cache: { tags: ['destinations', `destination_${id}`, `user_${destination.userId}_destinations`] },
    })
  }

  /**
   * Vérifier qu'une destination appartient à un utilisateur
   */
  async verifyOwnership(destinationId: number, userId: string): Promise<boolean> {
    const destination = await this.destinationRepo.findById(destinationId)
    if (!destination) {
      return false
    }
    return destination.userId === userId
  }

  /**
   * Compter les destinations d'un utilisateur
   */
  async countUserDestinations(userId: string): Promise<number> {
    return this.destinationRepo.countByUserId(userId)
  }
}
