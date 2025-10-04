import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import Destination from '#destinations/models/destination'

@injectable()
export default class DestinationRepository extends BaseRepository<typeof Destination> {
  protected model = Destination

  /**
   * Trouver toutes les destinations d'un utilisateur
   */
  async findByUserId(userId: string): Promise<Destination[]> {
    return this.findBy(
      { user_id: userId },
      {
        cache: { ttl: 300, tags: ['destinations', `user_${userId}_destinations`] },
      }
    )
  }

  /**
   * Trouver une destination avec ses vols
   */
  async findWithFlights(id: number): Promise<Destination | null> {
    const destination = await this.findById(id, {
      cache: { ttl: 300, tags: ['destinations', `destination_${id}`] },
    })

    if (destination) {
      await destination.load('flights')
    }

    return destination
  }

  /**
   * Trouver une destination avec son historique de prix
   */
  async findWithPriceHistory(id: number): Promise<Destination | null> {
    const destination = await this.findById(id, {
      cache: { ttl: 300, tags: ['destinations', `destination_${id}`] },
    })

    if (destination) {
      await destination.load('priceHistories')
    }

    return destination
  }

  /**
   * Trouver une destination avec tout (vols + historique)
   */
  async findWithRelations(id: number): Promise<Destination | null> {
    const destination = await this.findById(id, {
      cache: { ttl: 300, tags: ['destinations', `destination_${id}`] },
    })

    if (destination) {
      await destination.load('flights')
      await destination.load('priceHistories')
    }

    return destination
  }

  /**
   * Rechercher des destinations par origine et destination
   */
  async findByRoute(origin: string, destination: string): Promise<Destination[]> {
    return this.findBy({ origin, destination })
  }

  /**
   * Trouver les destinations actives d'un utilisateur (non supprimées)
   */
  async findActiveByUserId(userId: string): Promise<Destination[]> {
    const query = this.buildBaseQuery()
    return query.where('user_id', userId).orderBy('created_at', 'desc')
  }

  /**
   * Compter les destinations d'un utilisateur
   */
  async countByUserId(userId: string): Promise<number> {
    return this.count({ user_id: userId })
  }

  /**
   * Hook après création - invalider les caches utilisateur
   */
  protected async afterCreate(destination: Destination): Promise<void> {
    await super.afterCreate(destination)
    await this.cache!.invalidateTags([`user_${destination.userId}_destinations`])
  }

  /**
   * Hook après mise à jour - invalider les caches
   */
  protected async afterUpdate(destination: Destination): Promise<void> {
    await super.afterUpdate(destination)
    await this.cache!.invalidateTags([
      `destination_${destination.id}`,
      `user_${destination.userId}_destinations`,
    ])
  }

  /**
   * Hook après suppression - invalider les caches
   */
  protected async afterDelete(destination: Destination): Promise<void> {
    await super.afterDelete(destination)
    await this.cache!.invalidateTags([
      `destination_${destination.id}`,
      `user_${destination.userId}_destinations`,
    ])
  }
}
