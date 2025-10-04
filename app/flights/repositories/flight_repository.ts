import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import Flight from '#flights/models/flight'

@injectable()
export default class FlightRepository extends BaseRepository<typeof Flight> {
  protected model = Flight

  /**
   * Trouver tous les vols d'une destination
   */
  async findByDestinationId(destinationId: number): Promise<Flight[]> {
    return this.findBy(
      { destination_id: destinationId },
      {
        cache: { ttl: 300, tags: ['flights', `destination_${destinationId}_flights`] },
      }
    )
  }

  /**
   * Trouver les vols les moins chers pour une destination
   */
  async findCheapestByDestinationId(
    destinationId: number,
    limit: number = 10
  ): Promise<Flight[]> {
    const query = this.buildBaseQuery()
    return query
      .where('destination_id', destinationId)
      .orderBy('price', 'asc')
      .limit(limit)
  }

  /**
   * Trouver les vols directs pour une destination
   */
  async findDirectFlightsByDestinationId(destinationId: number): Promise<Flight[]> {
    return this.findBy({ destination_id: destinationId, stops: 0 })
  }

  /**
   * Trouver les derniers vols scannés pour une destination
   */
  async findLatestByDestinationId(
    destinationId: number,
    limit: number = 20
  ): Promise<Flight[]> {
    const query = this.buildBaseQuery()
    return query
      .where('destination_id', destinationId)
      .orderBy('created_at', 'desc')
      .limit(limit)
  }

  /**
   * Trouver les vols par compagnie
   */
  async findByAirline(airline: string, destinationId?: number): Promise<Flight[]> {
    const criteria: Record<string, any> = { airline }
    if (destinationId) {
      criteria.destination_id = destinationId
    }
    return this.findBy(criteria)
  }

  /**
   * Trouver le vol le moins cher pour une destination
   */
  async findCheapestForDestination(destinationId: number): Promise<Flight | null> {
    const query = this.buildBaseQuery()
    return query.where('destination_id', destinationId).orderBy('price', 'asc').first()
  }

  /**
   * Trouver le prix moyen pour une destination
   */
  async getAveragePriceByDestinationId(destinationId: number): Promise<number> {
    const query = this.buildBaseQuery()
    const result = await query
      .where('destination_id', destinationId)
      .avg('price as avg_price')
      .first()

    return parseFloat(result?.$extras?.avg_price || '0')
  }

  /**
   * Supprimer les anciens vols d'une destination (garder les N plus récents)
   */
  async pruneOldFlights(destinationId: number, keepCount: number = 100): Promise<void> {
    const allFlights = await this.findByDestinationId(destinationId)

    if (allFlights.length > keepCount) {
      const sorted = allFlights.sort(
        (a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()
      )
      const toDelete = sorted.slice(keepCount)

      for (const flight of toDelete) {
        await this.delete(flight.id, { soft: false })
      }
    }
  }

  /**
   * Hook après création - invalider les caches destination
   */
  protected async afterCreate(flight: Flight): Promise<void> {
    await super.afterCreate(flight)
    await this.cache!.invalidateTags([`destination_${flight.destinationId}_flights`])
  }

  /**
   * Hook après suppression - invalider les caches
   */
  protected async afterDelete(flight: Flight): Promise<void> {
    await super.afterDelete(flight)
    await this.cache!.invalidateTags([`destination_${flight.destinationId}_flights`])
  }
}
