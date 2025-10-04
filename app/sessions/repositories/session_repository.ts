import { injectable } from 'inversify'
import UserSession from '#sessions/models/user_session'
import { BaseRepository } from '#shared/repositories/base_repository'

@injectable()
export default class SessionRepository extends BaseRepository<typeof UserSession> {
  protected model = UserSession

  /**
   * Trouver toutes les sessions d'un utilisateur
   */
  async findByUserId(userId: string | number): Promise<UserSession[]> {
    return this.findBy({ user_id: userId }, {
      cache: { ttl: 300, tags: ['sessions', `user_sessions_${userId}`] }
    })
  }

  /**
   * Trouver les sessions actives d'un utilisateur
   */
  async findActiveByUserId(userId: string | number): Promise<UserSession[]> {
    const query = this.buildBaseQuery()

    return query
      .where('user_id', userId)
      .where('is_active', true)
      .orderBy('last_activity', 'desc')
  }

  /**
   * Fermer une session (marquer comme inactive)
   */
  async closeSession(sessionId: string | number): Promise<UserSession> {
    return this.update(sessionId, {
      is_active: false,
      ended_at: new Date(),
    } as any)
  }

  /**
   * Fermer toutes les sessions d'un utilisateur sauf une
   */
  async closeOtherUserSessions(
    userId: string | number,
    exceptSessionId?: string | number
  ): Promise<void> {
    const query = this.model.query()
      .where('user_id', userId)
      .where('is_active', true)

    if (exceptSessionId) {
      query.whereNot('id', exceptSessionId)
    }

    await query.update({
      is_active: false,
      ended_at: new Date(),
    })

    // Invalider les caches
    await this.cache.invalidateTags(['sessions', `user_sessions_${userId}`])
  }

  /**
   * Nettoyer les sessions expirées
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expiredDate = new Date()
    expiredDate.setHours(expiredDate.getHours() - 24) // Sessions de plus de 24h

    const expiredSessions = await this.model.query()
      .where('last_activity', '<', expiredDate)
      .where('is_active', true)

    const count = expiredSessions.length

    await this.model.query()
      .where('last_activity', '<', expiredDate)
      .where('is_active', true)
      .update({
        is_active: false,
        ended_at: new Date(),
      })

    // Invalider tous les caches de sessions
    await this.cache.invalidateTags(['sessions'])

    return count
  }

  /**
   * Mettre à jour l'activité d'une session
   */
  async updateLastActivity(sessionId: string | number): Promise<UserSession> {
    return this.update(sessionId, {
      last_activity: new Date(),
    } as any)
  }

  /**
   * Obtenir des statistiques de sessions
   */
  async getSessionStats(userId?: string | number): Promise<{
    total: number
    active: number
    today: number
  }> {
    const baseQuery = this.buildBaseQuery()

    if (userId) {
      baseQuery.where('user_id', userId)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [total, active, todaySessions] = await Promise.all([
      baseQuery.clone().getCount(),
      baseQuery.clone().where('is_active', true).getCount(),
      baseQuery.clone().where('created_at', '>=', today).getCount(),
    ])

    return {
      total: parseInt(total.toString()),
      active: parseInt(active.toString()),
      today: parseInt(todaySessions.toString()),
    }
  }

  /**
   * Vérifier si une session appartient à un utilisateur
   */
  async isSessionOwnedByUser(
    sessionId: string | number,
    userId: string | number
  ): Promise<boolean> {
    const session = await this.findById(sessionId)
    return session?.user_id === userId
  }

  /**
   * Hook après création - invalider les caches utilisateur
   */
  protected async afterCreate(session: UserSession): Promise<void> {
    await super.afterCreate(session)
    await this.cache.invalidateTags([`user_sessions_${session.user_id}`])
  }

  /**
   * Hook après mise à jour - invalider les caches utilisateur
   */
  protected async afterUpdate(session: UserSession): Promise<void> {
    await super.afterUpdate(session)
    await this.cache.invalidateTags([`user_sessions_${session.user_id}`])
  }

  /**
   * Hook après suppression - invalider les caches utilisateur
   */
  protected async afterDelete(session: UserSession): Promise<void> {
    await super.afterDelete(session)
    await this.cache.invalidateTags([`user_sessions_${session.user_id}`])
  }
}