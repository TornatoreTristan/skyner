import { injectable } from 'inversify'
import Organization from '#organizations/models/organization'
import { BaseRepository } from '#shared/repositories/base_repository'

@injectable()
export default class OrganizationRepository extends BaseRepository<typeof Organization> {
  protected model = Organization

  /**
   * Trouver une organisation par slug
   */
  async findBySlug(slug: string): Promise<Organization | null> {
    return this.findOneBy({ slug }, {
      cache: { ttl: 600, tags: ['organizations', 'org_slug'] }
    })
  }

  /**
   * Trouver une organisation avec ses membres
   */
  async findWithMembers(id: string | number): Promise<Organization | null> {
    const org = await this.findById(id)
    if (org) {
      await org.load('users')
    }
    return org
  }

  /**
   * Vérifier si un slug existe déjà
   */
  async slugExists(slug: string, excludeId?: string | number): Promise<boolean> {
    const criteria: Record<string, any> = { slug }

    if (excludeId) {
      const orgs = await this.findBy(criteria)
      return orgs.some(org => org.id !== excludeId)
    }

    return this.exists(criteria)
  }

  /**
   * Rechercher des organisations par nom
   */
  async search(term: string, limit: number = 10): Promise<Organization[]> {
    const query = this.buildBaseQuery()

    return query
      .where('name', 'LIKE', `%${term}%`)
      .limit(limit)
  }

  /**
   * Obtenir les organisations d'un utilisateur avec son rôle
   */
  async findByUserId(userId: string | number): Promise<Array<Organization & { pivot_role: string }>> {
    const query = this.buildBaseQuery()

    const results = await query
      .join('organization_users', 'organizations.id', 'organization_users.organization_id')
      .where('organization_users.user_id', userId)
      .select('organizations.*', 'organization_users.role as pivot_role')

    return results as Array<Organization & { pivot_role: string }>
  }

  /**
   * Ajouter un utilisateur à une organisation
   */
  async addUser(
    organizationId: string | number,
    userId: string | number,
    role: string
  ): Promise<void> {
    const org = await this.findByIdOrFail(organizationId)

    await org.related('users').attach({
      [userId]: {
        role,
        joined_at: new Date(),
      },
    })

    // Invalider les caches
    await this.cache.invalidateTags(['organizations', 'org_members'])
  }

  /**
   * Supprimer un utilisateur d'une organisation
   */
  async removeUser(organizationId: string | number, userId: string | number): Promise<void> {
    const org = await this.findByIdOrFail(organizationId)

    await org.related('users').detach([userId])

    // Invalider les caches
    await this.cache.invalidateTags(['organizations', 'org_members'])
  }

  /**
   * Mettre à jour le rôle d'un utilisateur dans une organisation
   */
  async updateUserRole(
    organizationId: string | number,
    userId: string | number,
    role: string
  ): Promise<void> {
    const org = await this.findByIdOrFail(organizationId)

    await org.related('users').pivotQuery().where('user_id', userId).update({ role })

    // Invalider les caches
    await this.cache.invalidateTags(['organizations', 'org_members'])
  }

  /**
   * Vérifier si un utilisateur est membre d'une organisation
   */
  async isUserMember(organizationId: string | number, userId: string | number): Promise<boolean> {
    const cacheKey = this.buildCacheKey('member', organizationId, userId)

    const cached = await this.cache.get<boolean>(cacheKey)
    if (cached !== null) return cached

    const org = await this.findByIdOrFail(organizationId)
    const membership = await org
      .related('users')
      .pivotQuery()
      .where('user_id', userId)
      .first()

    const isMember = !!membership

    // Cache pendant 5 minutes
    await this.cache.set(cacheKey, isMember, { ttl: 300, tags: ['org_members'] })

    return isMember
  }

  /**
   * Obtenir le rôle d'un utilisateur dans une organisation
   */
  async getUserRole(
    organizationId: string | number,
    userId: string | number
  ): Promise<string | null> {
    const org = await this.findByIdOrFail(organizationId)
    const membership = await org
      .related('users')
      .pivotQuery()
      .where('user_id', userId)
      .first()

    return membership?.role || null
  }

  /**
   * Hook après création - invalider les caches slug
   */
  protected async afterCreate(org: Organization): Promise<void> {
    await super.afterCreate(org)
    await this.cache.invalidateTags(['org_slug'])
  }

  /**
   * Hook après mise à jour - invalider les caches slug
   */
  protected async afterUpdate(org: Organization): Promise<void> {
    await super.afterUpdate(org)
    await this.cache.invalidateTags(['org_slug'])
  }
}