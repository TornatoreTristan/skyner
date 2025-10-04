import { injectable } from 'inversify'
import type { CreateUserData } from '#shared/types/user'
import UserModel from '#users/models/user'
import { BaseRepository } from '#shared/repositories/base_repository'

@injectable()
export default class UserRepository extends BaseRepository<typeof UserModel> {
  protected model = UserModel

  /**
   * Créer un utilisateur (legacy method pour compatibilité)
   */
  async save(userData: CreateUserData): Promise<UserModel> {
    return this.create(userData as any)
  }

  /**
   * Trouver un utilisateur par email
   */
  async findByEmail(email: string): Promise<UserModel | null> {
    return this.findOneBy({ email }, {
      cache: { ttl: 300, tags: ['users', 'user_email'] }
    })
  }

  /**
   * Mettre à jour le mot de passe d'un utilisateur
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<UserModel> {
    return this.update(userId, { password: hashedPassword } as any)
  }

  /**
   * Trouver un utilisateur avec ses organisations
   */
  async findWithOrganizations(id: string | number): Promise<UserModel | null> {
    const user = await this.findById(id)
    if (user) {
      await user.load('organizations')
    }
    return user
  }

  /**
   * Vérifier si un email existe déjà
   */
  async emailExists(email: string, excludeId?: string | number): Promise<boolean> {
    const criteria: Record<string, any> = { email }

    if (excludeId) {
      // Pour les mises à jour, exclure l'ID actuel
      const users = await this.findBy(criteria)
      return users.some(user => user.id !== excludeId)
    }

    return this.exists(criteria)
  }

  /**
   * Rechercher des utilisateurs par nom ou email
   */
  async search(term: string, limit: number = 10): Promise<UserModel[]> {
    const query = this.buildBaseQuery()

    return query
      .where((builder) => {
        builder
          .where('email', 'LIKE', `%${term}%`)
          .orWhere('full_name', 'LIKE', `%${term}%`)
      })
      .limit(limit)
  }

  /**
   * Obtenir les utilisateurs actifs (non supprimés)
   */
  async findActive(): Promise<UserModel[]> {
    return this.findAll({
      cache: { ttl: 600, tags: ['users', 'active_users'] }
    })
  }

  /**
   * Hook après création - invalider les caches email
   */
  protected async afterCreate(user: UserModel): Promise<void> {
    await super.afterCreate(user)
    await this.cache.invalidateTags(['user_email'])
  }

  /**
   * Hook après mise à jour - invalider les caches email
   */
  protected async afterUpdate(user: UserModel): Promise<void> {
    await super.afterUpdate(user)
    await this.cache.invalidateTags(['user_email'])
  }
}
