# 🏗️ Repository Pattern

Le **Repository Pattern** est au cœur de l'architecture de ce boilerplate. Il fournit une abstraction robuste pour l'accès aux données avec des fonctionnalités avancées intégrées.

## 🎯 Objectifs du Pattern

### Abstraction de la Couche Données
- Interface cohérente pour tous les modèles
- Découplage entre logique métier et persistence
- Facilite les tests avec mocking

### Fonctionnalités Avancées Intégrées
- Cache Redis automatique avec invalidation
- Soft deletes pour tous les modèles
- Hooks pour événements métier
- Gestion d'erreurs standardisée

## 🏗️ BaseRepository

### Structure Générale

```typescript
@injectable()
export abstract class BaseRepository<TModel extends LucidModel> {
  protected abstract model: TModel

  constructor(
    @inject(TYPES.CacheService) protected cache: CacheService,
    @inject(TYPES.EventBus) protected eventBus: EventBusService
  ) {}

  // CRUD Methods
  async findById(id: string | number, options?: FindOptions)
  async create(data: Partial<InstanceType<TModel>>, options?: CreateOptions)
  async update(id: string | number, data: Partial<InstanceType<TModel>>, options?: UpdateOptions)
  async delete(id: string | number, options?: DeleteOptions)

  // Query Methods
  async findAll(options?: FindOptions)
  async findBy(criteria: Record<string, any>, options?: FindOptions)
  async findOneBy(criteria: Record<string, any>, options?: FindOptions)
  async exists(criteria: Record<string, any>): Promise<boolean>
  async count(criteria?: Record<string, any>): Promise<number>
  async paginate(page: number, perPage: number, criteria?: Record<string, any>)

  // Soft Delete Methods
  async restore(id: string | number)
}
```

## 🔧 Implémentation d'un Repository

### Exemple : UserRepository

```typescript
import { injectable } from 'inversify'
import { BaseRepository } from '#shared/repositories/base_repository'
import User from '#users/models/user'

@injectable()
export default class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  // Méthodes personnalisées du domaine
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy({ email })
  }

  async findActiveUsers(): Promise<User[]> {
    return this.findBy({ status: 'active' })
  }

  async findUsersInOrganization(organizationId: string): Promise<User[]> {
    const query = this.buildBaseQuery()
    return query
      .whereHas('organizations', (orgQuery) => {
        orgQuery.where('organization_id', organizationId)
      })
  }
}
```

### Enregistrement dans le Container

```typescript
// shared/container/container.ts
container.bind<UserRepository>(TYPES.UserRepository).to(UserRepository)
```

## 📋 Options de Configuration

### FindOptions
```typescript
interface FindOptions {
  includeDeleted?: boolean    // Inclure les supprimés (soft delete)
  cache?: {
    ttl?: number             // Durée de vie en secondes
    tags?: string[]          // Tags pour invalidation groupée
  }
}

// Exemple d'utilisation
const user = await userRepo.findById('123', {
  includeDeleted: true,
  cache: { ttl: 3600, tags: ['users', 'user_123'] }
})
```

### CreateOptions
```typescript
interface CreateOptions {
  skipHooks?: boolean        // Ignorer les hooks before/after
  cache?: {
    tags?: string[]          // Tags à invalider après création
  }
}

// Exemple
const user = await userRepo.create(userData, {
  skipHooks: false,
  cache: { tags: ['users', 'user_list'] }
})
```

### UpdateOptions & DeleteOptions
```typescript
interface UpdateOptions {
  skipHooks?: boolean
  cache?: { tags?: string[] }
}

interface DeleteOptions {
  soft?: boolean            // true = soft delete, false = hard delete
  skipHooks?: boolean
  cache?: { tags?: string[] }
}
```

## 🗑️ Soft Deletes

### Configuration Automatique
Le BaseRepository détecte automatiquement si un modèle supporte les soft deletes :

```typescript
// Dans le modèle User
export default class User extends BaseModel {
  @column.dateTime()
  declare deleted_at: DateTime  // ← Détection automatique
}

// Vérification dans BaseRepository
protected supportsSoftDelete(): boolean {
  const columns = (this.model as any).$columnsDefinitions
  return columns && columns.has('deleted_at')
}
```

### Utilisation des Soft Deletes

```typescript
// Suppression logique (par défaut)
await userRepo.delete(userId)                    // soft delete
await userRepo.delete(userId, { soft: true })    // soft delete explicite
await userRepo.delete(userId, { soft: false })   // hard delete

// Recherche incluant les supprimés
const deletedUser = await userRepo.findById(userId, { includeDeleted: true })

// Restauration
const restoredUser = await userRepo.restore(userId)
```

### Comportement des Queries
```typescript
// Query normale - exclut les supprimés
const activeUsers = await userRepo.findAll()

// Query avec supprimés inclus
const allUsers = await userRepo.findAll({ includeDeleted: true })

// Le BaseRepository applique automatiquement whereNull('deleted_at')
```

## ⚡ Système de Cache

### Cache Automatique
```typescript
// Cache automatique sur findById
const user = await userRepo.findById('123', {
  cache: { ttl: 3600, tags: ['users', 'user_123'] }
})

// Clé de cache générée : "user:123"
// Tags associés : ['users', 'user_123']
```

### Invalidation du Cache
```typescript
// Lors d'une création
await userRepo.create(userData)
// → Invalide automatiquement les tags : ['user', 'user_list']

// Lors d'une mise à jour
await userRepo.update(userId, updateData)
// → Supprime : "user:123"
// → Invalide les listes d'utilisateurs

// Invalidation manuelle
await cache.invalidateTags(['users'])  // Invalide tous les utilisateurs
```

### Stratégie de Cache

| Opération | Cache Key | Tags Invalidés |
|-----------|-----------|----------------|
| `findById` | `model:id` | - |
| `create` | - | `[model, model_list]` |
| `update` | Supprime `model:id` | `[model, model_list]` |
| `delete` | Supprime `model:id` | `[model, model_list]` |

## 🎪 Hooks et Événements

### Hooks Disponibles
```typescript
// Dans BaseRepository - hooks automatiques
protected async beforeCreate(data: Partial<InstanceType<TModel>>): Promise<void>
protected async afterCreate(record: InstanceType<TModel>): Promise<void>
protected async beforeUpdate(id: string | number, data: Partial<InstanceType<TModel>>, record: InstanceType<TModel>): Promise<void>
protected async afterUpdate(record: InstanceType<TModel>): Promise<void>
protected async beforeDelete(record: InstanceType<TModel>): Promise<void>
protected async afterDelete(record: InstanceType<TModel>): Promise<void>
```

### Événements Automatiques
```typescript
// Émis automatiquement par BaseRepository
await eventBus.emit('user.before_create', { data })
await eventBus.emit('user.created', { record })
await eventBus.emit('user.before_update', { id, data, record })
await eventBus.emit('user.updated', { record })
await eventBus.emit('user.before_delete', { record })
await eventBus.emit('user.deleted', { record })
```

### Override des Hooks
```typescript
export default class UserRepository extends BaseRepository<typeof User> {
  protected async beforeCreate(data: Partial<User>): Promise<void> {
    // Appel du hook parent (événement)
    await super.beforeCreate(data)

    // Logique personnalisée
    if (!data.email) {
      throw new ValidationException('Email is required')
    }
  }

  protected async afterCreate(user: User): Promise<void> {
    await super.afterCreate(user)

    // Envoyer email de bienvenue
    await this.emailService.sendWelcome(user)
  }
}
```

## 🔍 Queries Avancées

### Pagination
```typescript
const result = await userRepo.paginate(page, perPage, criteria)

// Structure de réponse
interface PaginationResult<T> {
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
```

### Recherches Complexes
```typescript
// Dans votre repository personnalisé
export default class UserRepository extends BaseRepository<typeof User> {
  async findActiveUsersWithOrganizations(): Promise<User[]> {
    const query = this.buildBaseQuery() // Inclut automatiquement whereNull('deleted_at')

    return query
      .where('status', 'active')
      .preload('organizations')
      .orderBy('created_at', 'desc')
  }

  async searchUsers(searchTerm: string, organizationId?: string): Promise<User[]> {
    const query = this.buildBaseQuery()

    query.where((subQuery) => {
      subQuery
        .whereILike('email', `%${searchTerm}%`)
        .orWhereILike('full_name', `%${searchTerm}%`)
    })

    if (organizationId) {
      query.whereHas('organizations', (orgQuery) => {
        orgQuery.where('organization_id', organizationId)
      })
    }

    return query.orderBy('email', 'asc')
  }
}
```

## 🧪 Testing avec Repository

### Mock Repository
```typescript
// Dans les tests
const mockUserRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByEmail: jest.fn(),
} as jest.Mocked<UserRepository>

// Configuration du container pour les tests
container.rebind(TYPES.UserRepository).toConstantValue(mockUserRepo)
```

### Test d'un Service utilisant Repository
```typescript
test('should create user with hashed password', async ({ assert }) => {
  // Arrange
  const userData = { email: 'test@example.com', password: 'plain123' }
  const hashedUser = { ...userData, password: 'hashed123', id: '123' }

  mockUserRepo.create.mockResolvedValue(hashedUser as any)

  // Act
  const userService = getService<UserService>(TYPES.UserService)
  const result = await userService.create(userData)

  // Assert
  assert.equal(result.email, userData.email)
  assert.notEqual(result.password, userData.password) // Password should be hashed
  assert.equal(mockUserRepo.create.mock.calls.length, 1)
})
```

## 🚀 Utilisation dans les Services

### Service avec Repository
```typescript
@injectable()
export default class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  async createUser(data: CreateUserData): Promise<User> {
    // Validation métier
    await this.validateUniqueEmail(data.email)

    // Hash password
    const hashedPassword = await hash.make(data.password)

    // Création via repository
    return this.userRepo.create({
      ...data,
      password: hashedPassword
    }, {
      cache: { tags: ['users'] }
    })
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId, {
      cache: { ttl: 1800, tags: [`user_${userId}`] }
    })

    if (!user) {
      E.userNotFound(userId)
    }

    return user
  }

  private async validateUniqueEmail(email: string): Promise<void> {
    const existingUser = await this.userRepo.findByEmail(email)
    if (existingUser) {
      E.emailAlreadyExists(email)
    }
  }
}
```

## 🎯 Avantages du Pattern

### Maintenabilité
- **Interface standardisée** pour tous les modèles
- **Code réutilisable** avec fonctionnalités communes
- **Tests faciles** avec injection de dépendances

### Performance
- **Cache automatique** avec invalidation intelligente
- **Soft deletes** sans impact sur les performances
- **Queries optimisées** avec préloading

### Robustesse
- **Gestion d'erreurs** standardisée
- **Hooks métier** pour logique transversale
- **Événements** pour découplage

### Developer Experience
- **TypeScript** avec typage générique
- **Patterns cohérents** dans tout le projet
- **Configuration simple** par héritage

---

Le Repository Pattern dans ce boilerplate offre une base solide et extensible pour gérer la persistence des données dans vos applications d'entreprise.