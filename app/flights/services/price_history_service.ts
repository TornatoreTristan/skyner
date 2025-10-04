import { injectable, inject } from 'inversify'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import PriceHistoryRepository from '#flights/repositories/price_history_repository'
import PriceHistory from '#flights/models/price_history'

export interface CreatePriceHistoryData {
  destinationId: number
  price: number
  currency: string
  scannedAt?: DateTime
  metadata?: {
    airline?: string
    stops?: number
    departureDate?: string
    returnDate?: string
    source?: string
  }
}

export interface PriceStatistics {
  min: number
  max: number
  avg: number
  count: number
  trend?: 'up' | 'down' | 'stable'
  variance?: number
}

@injectable()
export default class PriceHistoryService {
  constructor(
    @inject(TYPES.PriceHistoryRepository) private priceHistoryRepo: PriceHistoryRepository
  ) {}

  /**
   * Enregistrer un nouveau prix dans l'historique
   */
  async recordPrice(data: CreatePriceHistoryData): Promise<PriceHistory> {
    const scannedAt = data.scannedAt || DateTime.now()

    return this.priceHistoryRepo.create(
      {
        ...data,
        scannedAt,
      } as any,
      {
        cache: { tags: ['price_histories', `destination_${data.destinationId}_history`] },
      }
    )
  }

  /**
   * Récupérer l'historique complet d'une destination
   */
  async getHistoryForDestination(destinationId: number): Promise<PriceHistory[]> {
    return this.priceHistoryRepo.findByDestinationIdOrdered(destinationId, 'asc')
  }

  /**
   * Récupérer l'historique dans une période donnée
   */
  async getHistoryByDateRange(
    destinationId: number,
    startDate: DateTime,
    endDate: DateTime
  ): Promise<PriceHistory[]> {
    return this.priceHistoryRepo.findByDateRange(destinationId, startDate, endDate)
  }

  /**
   * Obtenir le prix le plus bas enregistré
   */
  async getLowestPrice(destinationId: number): Promise<PriceHistory | null> {
    return this.priceHistoryRepo.findLowestPrice(destinationId)
  }

  /**
   * Obtenir le prix le plus haut enregistré
   */
  async getHighestPrice(destinationId: number): Promise<PriceHistory | null> {
    return this.priceHistoryRepo.findHighestPrice(destinationId)
  }

  /**
   * Obtenir des statistiques complètes sur les prix
   */
  async getStatistics(destinationId: number): Promise<PriceStatistics> {
    const stats = await this.priceHistoryRepo.getStatistics(destinationId)

    // Calculer la tendance sur les 7 derniers jours
    const recentHistory = await this.priceHistoryRepo.findLatestByDestinationId(
      destinationId,
      7
    )

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (recentHistory.length >= 2) {
      const oldest = recentHistory[recentHistory.length - 1]
      const newest = recentHistory[0]
      const priceChange = newest.price - oldest.price
      const percentChange = (priceChange / oldest.price) * 100

      if (percentChange > 5) trend = 'up'
      else if (percentChange < -5) trend = 'down'
    }

    // Calculer la variance (écart-type)
    let variance = 0
    if (recentHistory.length > 1) {
      const mean = recentHistory.reduce((sum, h) => sum + h.price, 0) / recentHistory.length
      const squaredDiffs = recentHistory.map((h) => Math.pow(h.price - mean, 2))
      variance = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / recentHistory.length)
    }

    return {
      ...stats,
      trend,
      variance,
    }
  }

  /**
   * Obtenir le prix moyen sur une période
   */
  async getAveragePrice(
    destinationId: number,
    startDate?: DateTime,
    endDate?: DateTime
  ): Promise<number> {
    return this.priceHistoryRepo.getAveragePrice(destinationId, startDate, endDate)
  }

  /**
   * Vérifier si le prix actuel est un bon deal
   */
  async isGoodDeal(destinationId: number, currentPrice: number): Promise<{
    isGoodDeal: boolean
    percentageBelowAverage: number
    percentageBelowLowest: number
  }> {
    const stats = await this.priceHistoryRepo.getStatistics(destinationId)

    if (stats.count === 0) {
      return {
        isGoodDeal: false,
        percentageBelowAverage: 0,
        percentageBelowLowest: 0,
      }
    }

    const percentageBelowAverage = ((stats.avg - currentPrice) / stats.avg) * 100
    const percentageBelowLowest = ((stats.min - currentPrice) / stats.min) * 100

    // Bon deal si 10% en dessous de la moyenne
    const isGoodDeal = percentageBelowAverage >= 10

    return {
      isGoodDeal,
      percentageBelowAverage,
      percentageBelowLowest,
    }
  }

  /**
   * Obtenir les derniers prix scannés
   */
  async getLatestPrices(destinationId: number, limit: number = 30): Promise<PriceHistory[]> {
    return this.priceHistoryRepo.findLatestByDestinationId(destinationId, limit)
  }

  /**
   * Nettoyer les anciennes entrées (garder les N plus récentes)
   */
  async pruneOldEntries(destinationId: number, keepCount: number = 365): Promise<void> {
    await this.priceHistoryRepo.pruneOldEntries(destinationId, keepCount)
  }
}
