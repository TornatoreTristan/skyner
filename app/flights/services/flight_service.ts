import { inject, injectable } from 'inversify'
import { TYPES } from '#shared/container/types'
import FlightRepository from '#flights/repositories/flight_repository'

@injectable()
export default class FlightService {
  constructor(@inject(TYPES.FlightRepository) private flightRepository: FlightRepository) {}

  /**
   * Récupère tous les vols d'une destination
   */
  async getFlightsByDestination(destinationId: number) {
    return this.flightRepository.findByDestinationId(destinationId)
  }

  /**
   * Récupère les vols les moins chers
   */
  async getCheapestFlights(destinationId: number, limit: number = 10) {
    return this.flightRepository.findCheapestByDestinationId(destinationId, limit)
  }

  /**
   * Récupère le vol le moins cher
   */
  async getCheapestFlight(destinationId: number) {
    return this.flightRepository.findCheapestForDestination(destinationId)
  }

  /**
   * Récupère les vols directs
   */
  async getDirectFlights(destinationId: number) {
    return this.flightRepository.findDirectFlightsByDestinationId(destinationId)
  }

  /**
   * Récupère les derniers vols scannés
   */
  async getLatestFlights(destinationId: number, limit: number = 20) {
    return this.flightRepository.findLatestByDestinationId(destinationId, limit)
  }

  /**
   * Récupère le prix moyen des vols
   */
  async getAveragePrice(destinationId: number): Promise<number> {
    return this.flightRepository.getAveragePriceByDestinationId(destinationId)
  }

  /**
   * Recherche et sauvegarde les vols pour une destination
   * TODO: Implémenter l'intégration Amadeus
   */
  async searchAndSaveFlights(destinationId: number) {
    // Pour l'instant, retourne un placeholder
    // Sera implémenté avec Amadeus
    return {
      searched: true,
      destinationId,
      flightsFound: 0,
      message: 'Amadeus integration not implemented yet',
    }
  }

  /**
   * Recherche générique de vols
   * TODO: Implémenter l'intégration Amadeus
   */
  async searchFlights(_searchParams: any) {
    // Pour l'instant, retourne un placeholder
    // Sera implémenté avec Amadeus
    return []
  }

  /**
   * Nettoie les anciens vols
   */
  async pruneOldFlights(destinationId: number, keepCount: number = 100): Promise<void> {
    await this.flightRepository.pruneOldFlights(destinationId, keepCount)
  }
}
