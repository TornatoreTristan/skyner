import { injectable } from 'inversify'
import { DateTime } from 'luxon'
import { BaseRepository } from '#shared/repositories/base_repository'
import PriceHistory from '#flights/models/price_history'

@injectable()
export default class PriceHistoryRepository extends BaseRepository<typeof PriceHistory> {
  protected model = PriceHistory

  /**
   * Trouver l'historique des prix d'une destination
   */
  async findByDestinationId(destinationId: number): Promise<PriceHistory[]> {
    return this.findBy(
      { destination_id: destinationId },
      {
        cache: { ttl: 300, tags: ['price_histories', `destination_${destinationId}_history`] },
      }
    )
  }

  /**
   * Trouver l'historique des prix avec tri par date
   */
  async findByDestinationIdOrdered(
    destinationId: number,
    order: 'asc' | 'desc' = 'asc'
  ): Promise<PriceHistory[]> {
    const query = this.buildBaseQuery()
    return query.where('destination_id', destinationId).orderBy('scanned_at', order)
  }

  /**
   * Trouver l'historique dans une période donnée
   */
  async findByDateRange(
    destinationId: number,
    startDate: DateTime,
    endDate: DateTime
  ): Promise<PriceHistory[]> {
    const query = this.buildBaseQuery()
    return query
      .where('destination_id', destinationId)
      .whereBetween('scanned_at', [startDate.toSQL(), endDate.toSQL()])
      .orderBy('scanned_at', 'asc')
  }

  /**
   * Trouver le prix le plus bas dans l'historique
   */
  async findLowestPrice(destinationId: number): Promise<PriceHistory | null> {
    const query = this.buildBaseQuery()
    return query.where('destination_id', destinationId).orderBy('price', 'asc').first()
  }

  /**
   * Trouver le prix le plus haut dans l'historique
   */
  async findHighestPrice(destinationId: number): Promise<PriceHistory | null> {
    const query = this.buildBaseQuery()
    return query.where('destination_id', destinationId).orderBy('price', 'desc').first()
  }

  /**
   * Obtenir le prix moyen sur une période
   */
  async getAveragePrice(
    destinationId: number,
    startDate?: DateTime,
    endDate?: DateTime
  ): Promise<number> {
    const query = this.buildBaseQuery()
    query.where('destination_id', destinationId)

    if (startDate && endDate) {
      query.whereBetween('scanned_at', [startDate.toSQL(), endDate.toSQL()])
    }

    const result = await query.avg('price as avg_price').first()
    return parseFloat(result?.$extras?.avg_price || '0')
  }

  /**
   * Obtenir les derniers prix enregistrés
   */
  async findLatestByDestinationId(
    destinationId: number,
    limit: number = 30
  ): Promise<PriceHistory[]> {
    const query = this.buildBaseQuery()
    return query
      .where('destination_id', destinationId)
      .orderBy('scanned_at', 'desc')
      .limit(limit)
  }

  /**
   * Compter le nombre d'entrées pour une destination
   */
  async countByDestinationId(destinationId: number): Promise<number> {
    return this.count({ destination_id: destinationId })
  }

  /**
   * Supprimer les anciennes entrées (garder les N plus récentes)
   */
  async pruneOldEntries(destinationId: number, keepCount: number = 365): Promise<void> {
    const allEntries = await this.findByDestinationIdOrdered(destinationId, 'desc')

    if (allEntries.length > keepCount) {
      const toDelete = allEntries.slice(keepCount)

      for (const entry of toDelete) {
        await this.delete(entry.id, { soft: false })
      }
    }
  }

  /**
   * Obtenir des statistiques sur les prix
   */
  async getStatistics(destinationId: number): Promise<{
    min: number
    max: number
    avg: number
    count: number
  }> {
    const query = this.buildBaseQuery()
    const result = await query
      .where('destination_id', destinationId)
      .select(
        this.model.query().client.raw('MIN(price) as min'),
        this.model.query().client.raw('MAX(price) as max'),
        this.model.query().client.raw('AVG(price) as avg'),
        this.model.query().client.raw('COUNT(*) as count')
      )
      .first()

    return {
      min: parseFloat(result?.$extras?.min || result?.min || '0'),
      max: parseFloat(result?.$extras?.max || result?.max || '0'),
      avg: parseFloat(result?.$extras?.avg || result?.avg || '0'),
      count: parseInt(result?.$extras?.count || result?.count || '0'),
    }
  }

  /**
   * Hook après création - invalider les caches
   */
  protected async afterCreate(priceHistory: PriceHistory): Promise<void> {
    await super.afterCreate(priceHistory)
    await this.cache!.invalidateTags([
      `destination_${priceHistory.destinationId}_history`,
    ])
  }
}
