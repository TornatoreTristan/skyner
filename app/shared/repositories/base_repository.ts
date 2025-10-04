import { injectable, inject } from 'inversify'
import type { LucidModel, LucidRow, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { DateTime } from 'luxon'
import { TYPES } from '#shared/container/types'
import type CacheService from '#shared/services/cache_service'
import type EventBusService from '#shared/services/event_bus_service'
import { E } from '#shared/exceptions/index'

export interface PaginationResult<T> {
  data: T[]
  meta: {
    total: number
    perPage: number
    currentPage: number
    lastPage: number
    firstPage: number
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl: string | null
    previousPageUrl: string | null
  }
}

export interface FindOptions {
  includeDeleted?: boolean
  cache?: {
    ttl?: number
    tags?: string[]
  }
}

export interface CreateOptions {
  skipHooks?: boolean
  cache?: {
    tags?: string[]
  }
}

export interface UpdateOptions {
  skipHooks?: boolean
  cache?: {
    tags?: string[]
  }
}

export interface DeleteOptions {
  soft?: boolean // true = soft delete, false = hard delete
  skipHooks?: boolean
  cache?: {
    tags?: string[]
  }
}

@injectable()
export abstract class BaseRepository<TModel extends LucidModel> {
  protected abstract model: TModel

  constructor(
    @inject(TYPES.CacheService) protected cache?: CacheService,
    @inject(TYPES.EventBus) protected eventBus?: EventBusService
  ) {
    // Si les services ne sont pas injectés, les récupérer du container
    if (!this.cache || !this.eventBus) {
      try {
        const { getService } = require('#shared/container/container')
        this.cache = this.cache || getService(TYPES.CacheService)
        this.eventBus = this.eventBus || getService(TYPES.EventBus)
      } catch (error) {
        // En cas d'erreur (tests), créer des mocks
        this.cache = this.cache || this.createMockCache()
        this.eventBus = this.eventBus || this.createMockEventBus()
      }
    }
  }

  // ==========================================
  // CRUD DE BASE
  // ==========================================

  /**
   * Trouver un enregistrement par ID
   */
  async findById(
    id: string | number,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel> | null> {
    const cacheKey = this.buildCacheKey('id', id)

    if (options.cache) {
      const cached = await this.cache!.get<InstanceType<TModel>>(cacheKey)
      if (cached) return cached
    }

    const query = this.buildBaseQuery(options.includeDeleted)
    const result = await query.where('id', id).first()

    if (result && options.cache) {
      await this.cache!.set(cacheKey, result, options.cache)
    }

    return result
  }

  /**
   * Trouver un enregistrement par ID ou lever une exception
   */
  async findByIdOrFail(
    id: string | number,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel>> {
    const result = await this.findById(id, options)

    if (!result) {
      E.notFound(this.getModelName(), id)
    }

    return result
  }

  /**
   * Trouver tous les enregistrements
   */
  async findAll(options: FindOptions = {}): Promise<InstanceType<TModel>[]> {
    const cacheKey = this.buildCacheKey('all')

    if (options.cache) {
      const cached = await this.cache!.get<InstanceType<TModel>[]>(cacheKey)
      if (cached) return cached
    }

    const query = this.buildBaseQuery(options.includeDeleted)
    const results = await query

    if (options.cache) {
      await this.cache!.set(cacheKey, results, options.cache)
    }

    return results
  }

  /**
   * Trouver par critères
   */
  async findBy(
    criteria: Record<string, any>,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel>[]> {
    const query = this.buildBaseQuery(options.includeDeleted)

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    return await query
  }

  /**
   * Trouver un enregistrement par critères
   */
  async findOneBy(
    criteria: Record<string, any>,
    options: FindOptions = {}
  ): Promise<InstanceType<TModel> | null> {
    const query = this.buildBaseQuery(options.includeDeleted)

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    return await query.first()
  }

  /**
   * Créer un nouvel enregistrement
   */
  async create(
    data: Partial<InstanceType<TModel>>,
    options: CreateOptions = {}
  ): Promise<InstanceType<TModel>> {
    // Hook avant création
    if (!options.skipHooks) {
      await this.beforeCreate(data)
    }

    const result = await this.model.create(data as any)

    // Hook après création
    if (!options.skipHooks) {
      await this.afterCreate(result)
    }

    // Invalidation du cache
    if (options.cache?.tags) {
      await this.cache!.invalidateTags(options.cache.tags)
    }
    await this.invalidateListCaches()

    return result
  }

  /**
   * Mettre à jour un enregistrement
   */
  async update(
    id: string | number,
    data: Partial<InstanceType<TModel>>,
    options: UpdateOptions = {}
  ): Promise<InstanceType<TModel>> {
    const record = await this.findByIdOrFail(id)

    // Hook avant mise à jour
    if (!options.skipHooks) {
      await this.beforeUpdate(id, data, record)
    }

    // Mise à jour
    record.merge(data as any)
    await record.save()

    // Hook après mise à jour
    if (!options.skipHooks) {
      await this.afterUpdate(record)
    }

    // Invalidation du cache
    await this.cache!.del(this.buildCacheKey('id', id))
    if (options.cache?.tags) {
      await this.cache!.invalidateTags(options.cache.tags)
    }
    await this.invalidateListCaches()

    return record
  }

  /**
   * Supprimer un enregistrement
   */
  async delete(id: string | number, options: DeleteOptions = {}): Promise<void> {
    const { soft = true } = options
    const record = await this.findByIdOrFail(id)

    // Hook avant suppression
    if (!options.skipHooks) {
      await this.beforeDelete(record)
    }

    if (soft && this.supportsSoftDelete()) {
      // Soft delete
      record.merge({ deleted_at: DateTime.now() } as any)
      await record.save()
    } else {
      // Hard delete
      await record.delete()
    }

    // Hook après suppression
    if (!options.skipHooks) {
      await this.afterDelete(record)
    }

    // Invalidation du cache
    await this.cache!.del(this.buildCacheKey('id', id))
    if (options.cache?.tags) {
      await this.cache!.invalidateTags(options.cache.tags)
    }
    await this.invalidateListCaches()
  }

  /**
   * Restaurer un enregistrement supprimé (soft delete)
   */
  async restore(id: string | number): Promise<InstanceType<TModel>> {
    if (!this.supportsSoftDelete()) {
      throw new Error(`${this.getModelName()} does not support soft deletes`)
    }

    const record = await this.findById(id, { includeDeleted: true })

    if (!record) {
      E.notFound(this.getModelName(), id)
    }

    record.merge({ deleted_at: null } as any)
    await record.save()

    // Invalidation du cache
    await this.cache!.del(this.buildCacheKey('id', id))
    await this.invalidateListCaches()

    return record
  }

  // ==========================================
  // QUERIES AVANCÉES
  // ==========================================

  /**
   * Vérifier si un enregistrement existe
   */
  async exists(criteria: Record<string, any>): Promise<boolean> {
    const query = this.buildBaseQuery()

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    const count = await query.getCount()
    return count > 0
  }

  /**
   * Compter les enregistrements
   */
  async count(criteria: Record<string, any> = {}): Promise<number> {
    const query = this.buildBaseQuery()

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    const result = await query.count('* as total')
    return parseInt(result[0]?.total || '0')
  }

  /**
   * Pagination
   */
  async paginate(
    page: number = 1,
    perPage: number = 20,
    criteria: Record<string, any> = {}
  ): Promise<PaginationResult<InstanceType<TModel>>> {
    const query = this.buildBaseQuery()

    for (const [key, value] of Object.entries(criteria)) {
      query.where(key, value)
    }

    const result = await query.paginate(page, perPage)

    return {
      data: result.all(),
      meta: result.getMeta(),
    } as PaginationResult<InstanceType<TModel>>
  }

  // ==========================================
  // HOOKS (à override dans les sous-classes)
  // ==========================================

  protected async beforeCreate(data: Partial<InstanceType<TModel>>): Promise<void> {
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.before_create`, { data })
  }

  protected async afterCreate(record: InstanceType<TModel>): Promise<void> {
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.created`, { record })
  }

  protected async beforeUpdate(
    id: string | number,
    data: Partial<InstanceType<TModel>>,
    record: InstanceType<TModel>
  ): Promise<void> {
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.before_update`, { id, data, record })
  }

  protected async afterUpdate(record: InstanceType<TModel>): Promise<void> {
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.updated`, { record })
  }

  protected async beforeDelete(record: InstanceType<TModel>): Promise<void> {
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.before_delete`, { record })
  }

  protected async afterDelete(record: InstanceType<TModel>): Promise<void> {
    await this.eventBus!.emit(`${this.getModelName().toLowerCase()}.deleted`, { record })
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Construire une query de base avec gestion des soft deletes
   */
  protected buildBaseQuery(includeDeleted: boolean = false): ModelQueryBuilderContract<TModel, InstanceType<TModel>> {
    const query = this.model.query()

    if (!includeDeleted && this.supportsSoftDelete()) {
      query.whereNull('deleted_at')
    }

    return query
  }

  /**
   * Vérifier si le modèle supporte les soft deletes
   */
  protected supportsSoftDelete(): boolean {
    // Vérifier si le modèle a une colonne deleted_at dans ses colonnes définies
    const columns = (this.model as any).$columnsDefinitions
    return columns && columns.has('deleted_at')
  }

  /**
   * Obtenir le nom du modèle
   */
  protected getModelName(): string {
    return this.model.name
  }

  /**
   * Construire une clé de cache
   */
  protected buildCacheKey(...parts: (string | number)[]): string {
    return [this.getModelName().toLowerCase(), ...parts].join(':')
  }

  /**
   * Invalider les caches de listes
   */
  protected async invalidateListCaches(): Promise<void> {
    await this.cache!.invalidateTags([
      this.getModelName().toLowerCase(),
      `${this.getModelName().toLowerCase()}_list`,
    ])
  }

  /**
   * Créer un mock de cache pour les tests
   */
  private createMockCache(): CacheService {
    return {
      get: async () => null,
      set: async () => {},
      del: async () => {},
      invalidateTags: async () => {},
      exists: async () => false,
      flush: async () => {},
    } as any
  }

  /**
   * Créer un mock d'event bus pour les tests
   */
  private createMockEventBus(): EventBusService {
    return {
      emit: async () => true,
      on: () => {},
      once: () => {},
      off: () => {},
    } as any
  }
}