# 🤖 Claude Code Guidelines

> Instructions pour maintenir la cohérence architecturale du boilerplate AdonisJS 6

## 🎯 Architecture Obligatoire

### Repository Pattern
- **TOUJOURS** utiliser `BaseRepository<T>` pour les nouveaux modèles
- **JAMAIS** faire du Lucid direct dans les services
- Hériter et étendre : `class FooRepository extends BaseRepository<typeof Foo>`

```typescript
// ✅ CORRECT
@injectable()
export default class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  async findByEmail(email: string) {
    return this.findOneBy({ email })
  }
}

// ❌ INCORRECT - Lucid direct
const user = await User.findBy('email', email)
```

### Injection de Dépendances (Inversify)
- **TOUJOURS** utiliser `@injectable()` sur les services/repositories
- **TOUJOURS** injecter avec `@inject(TYPES.ServiceName)`
- **TOUJOURS** récupérer via `getService<T>(TYPES.ServiceName)`

```typescript
// ✅ CORRECT
@injectable()
export default class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}
}

// Dans controller
const userService = getService<UserService>(TYPES.UserService)
```

### Gestion d'Erreurs
- **TOUJOURS** utiliser les exceptions personnalisées : `E.methodName()`
- **JAMAIS** throw Error() direct
- Suivre la hiérarchie : `ValidationException`, `NotFoundException`, etc.

```typescript
// ✅ CORRECT
if (!user) {
  E.userNotFound(userId)
}

// ❌ INCORRECT
throw new Error('User not found')
```

## 🗂️ Structure des Modules

### Organisation par Domaine
```
app/domain_name/
├── controllers/     # HTTP handlers
├── services/        # Business logic
├── repositories/    # Data access (extends BaseRepository)
├── models/          # Lucid models
├── validators/      # Vine validators
└── types/           # TypeScript interfaces
```

### Nommage des Fichiers
- Controllers : `domain_controller.ts` (ex: `users_controller.ts`)
- Services : `domain_service.ts` (ex: `user_service.ts`)
- Repositories : `domain_repository.ts` (ex: `user_repository.ts`)
- Models : `domain.ts` (ex: `user.ts`)

## 📊 Base de Données

### Migrations
- **JAMAIS** créer de nouvelles migrations sans demander
- **TOUJOURS** modifier les migrations existantes si possible
- **TOUJOURS** rollback avant modification : utilisateur confirme

### Soft Deletes
- Si le modèle a `deleted_at: DateTime`, le soft delete est automatique
- **TOUJOURS** utiliser `repository.delete(id, { soft: true })` par défaut
- Utiliser `{ soft: false }` seulement si explicitement demandé

```typescript
// ✅ Par défaut - soft delete
await userRepo.delete(userId)

// ✅ Si hard delete explicitement demandé
await userRepo.delete(userId, { soft: false })
```

## ⚡ Cache & Performance

### Cache Redis
- **TOUJOURS** utiliser les options cache dans les repositories
- **TOUJOURS** définir des tags pertinents pour invalidation
- TTL par défaut : 1800s (30min) pour les entités, 3600s (1h) pour les listes

```typescript
// ✅ CORRECT
const user = await userRepo.findById(id, {
  cache: { ttl: 1800, tags: [`user_${id}`, 'users'] }
})

// ✅ Invalidation lors des mutations
await userRepo.create(data, {
  cache: { tags: ['users'] }
})
```

### Events & Hooks
- Les événements sont automatiques via BaseRepository
- Écouter avec : `eventBus.on('model.event', handler)`
- Events disponibles : `before_create`, `created`, `updated`, `deleted`

## 🧪 Test-Driven Development (TDD)

### Workflow TDD OBLIGATOIRE
1. **RED** : Écrire le test qui échoue d'abord
2. **GREEN** : Implémenter le minimum pour que le test passe
3. **REFACTOR** : Améliorer le code en gardant les tests verts

### Exemple TDD Complet
```typescript
// 1. RED - Test d'abord (doit échouer)
test('should create user with hashed password', async ({ assert }) => {
  const userService = getService<UserService>(TYPES.UserService)
  const userData = { email: 'test@example.com', password: 'plain123' }

  const result = await userService.create(userData)

  assert.notEqual(result.password, 'plain123') // Should be hashed
  assert.equal(result.email, userData.email)
})

// 2. GREEN - Implémentation minimale
async create(data: CreateUserData): Promise<User> {
  const hashedPassword = await hash.make(data.password)
  return this.userRepo.create({ ...data, password: hashedPassword })
}

// 3. REFACTOR - Améliorer (validation, cache, etc.)
async create(data: CreateUserData): Promise<User> {
  // Validation métier
  await this.validateUniqueEmail(data.email)

  // Hash password
  const hashedPassword = await hash.make(data.password)

  // Création avec cache
  return this.userRepo.create({
    ...data,
    password: hashedPassword
  }, {
    cache: { tags: ['users'] }
  })
}
```

### Commands de Test
```bash
# TOUJOURS utiliser cette commande simple
npm run test

# Tests en mode watch pour TDD
npm run test -- --watch

# JAMAIS des commandes complexes
# ❌ npm run test -- --grep "specific"
```

### Structure des Tests
- Tests unitaires : `tests/unit/domain/`
- Tests fonctionnels : `tests/functional/domain/`
- **TOUJOURS** écrire les tests AVANT l'implémentation (TDD)
- **TOUJOURS** vérifier que le test échoue d'abord (RED)
- **TOUJOURS** implémenter le minimum (GREEN)
- **TOUJOURS** refactorer après (REFACTOR)

### Mocking pour Tests
```typescript
// ✅ Mock des repositories pour tests unitaires
const mockUserRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  findByEmail: jest.fn(),
} as jest.Mocked<UserRepository>

container.rebind(TYPES.UserRepository).toConstantValue(mockUserRepo)

// ✅ Setup des mocks avant test
mockUserRepo.create.mockResolvedValue(expectedUser)
mockUserRepo.findByEmail.mockResolvedValue(null) // Email unique
```

## 🚀 Development Workflow

### Commandes Principales
```bash
# Développement
npm run dev

# Tests
npm run test

# Linting (si disponible)
npm run lint

# Build (si disponible)
npm run build

# Base de données
node ace migration:run
node ace migration:rollback
```

### Workflow TDD pour Nouvelles Fonctionnalités
1. **RED** : Écrire le test qui échoue
2. **GREEN** : Implémenter le minimum pour passer
3. **REFACTOR** : Améliorer le code
4. **TOUJOURS** run `npm run test`
5. **TOUJOURS** run lint si disponible
6. **JAMAIS** commit sans validation

## 📝 Code Patterns

### Controllers
```typescript
export default class UsersController {
  async store({ request }: HttpContext) {
    // 1. Récupérer service
    const userService = getService<UserService>(TYPES.UserService)

    // 2. Validation (Vine validator)
    const data = await request.validateUsing(createUserValidator)

    // 3. Appel service
    const user = await userService.create(data)

    // 4. Response
    return { user }
  }
}
```

### Services
```typescript
@injectable()
export default class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository
  ) {}

  async create(data: CreateUserData): Promise<User> {
    // 1. Validation métier
    await this.validateUniqueEmail(data.email)

    // 2. Transformation données
    const hashedPassword = await hash.make(data.password)

    // 3. Création via repository
    return this.userRepo.create({
      ...data,
      password: hashedPassword
    })
  }
}
```

### Repositories
```typescript
@injectable()
export default class UserRepository extends BaseRepository<typeof User> {
  protected model = User

  // Méthodes domaine spécifiques
  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy({ email })
  }

  async findActiveUsers(): Promise<User[]> {
    return this.findBy({ status: 'active' })
  }
}
```

## 🔒 Sécurité

### Authentification
- **TOUJOURS** utiliser le middleware `auth` pour les routes protégées
- **TOUJOURS** accéder à l'utilisateur via `ctx.user` (injecté par AuthMiddleware)
- Session tracking automatique avec `UpdateSessionActivityMiddleware`

### Validation
- **TOUJOURS** utiliser Vine validators
- **JAMAIS** faire confiance aux données utilisateur
- **TOUJOURS** valider format email avec `.email().normalizeEmail()`

## 🎯 Conventions Spécifiques

### Clean Code OBLIGATOIRE

#### Nommage
- **Variables/Méthodes** : `camelCase` explicite (`getUserById` vs `get`)
- **Classes** : `PascalCase` avec intention claire (`UserService` vs `Service`)
- **Constantes** : `UPPER_SNAKE_CASE` (`MAX_RETRY_COUNT`)
- **JAMAIS** d'abréviations (`user` vs `usr`, `calculate` vs `calc`)

#### Fonctions
- **Une responsabilité** par fonction
- **Maximum 20 lignes** par fonction
- **Noms explicites** qui décrivent l'action (`validateUserEmail` vs `validate`)
- **Paramètres** : maximum 3-4, sinon utiliser un objet

```typescript
// ✅ CORRECT - Clean
async createUserWithValidation(userData: CreateUserData): Promise<User> {
  await this.validateUniqueEmail(userData.email)
  const hashedPassword = await this.hashPassword(userData.password)
  return this.persistUser({ ...userData, password: hashedPassword })
}

// ❌ INCORRECT - Pas clean
async create(d: any): Promise<any> {
  if (!d.email) throw new Error('Invalid')
  const u = await User.findBy('email', d.email)
  if (u) throw new Error('Exists')
  const p = await hash.make(d.password)
  return User.create({ ...d, password: p })
}
```

#### Principes SOLID
- **S**ingle Responsibility : Une classe = une responsabilité
- **O**pen/Closed : Extensible sans modification (interfaces)
- **L**iskov Substitution : Les sous-classes remplacent les classes parentes
- **I**nterface Segregation : Interfaces spécialisées vs généralistes
- **D**ependency Inversion : Dépendre d'abstractions (injection)

#### TypeScript
- **TOUJOURS** typer explicitement les paramètres publics
- **TOUJOURS** utiliser les interfaces du domaine
- **JAMAIS** `any` sauf cas exceptionnels avec commentaire
- **TOUJOURS** définir des types métier clairs

```typescript
// ✅ CORRECT
interface CreateUserData {
  email: string
  password: string
  fullName?: string
}

async createUser(userData: CreateUserData): Promise<User>

// ❌ INCORRECT
async createUser(data: any): Promise<any>
```

### Imports
- **TOUJOURS** utiliser les alias : `#shared/`, `#users/`, etc.
- **JAMAIS** d'imports relatifs profonds : `../../../`

### Comments
- **JAMAIS** ajouter de commentaires sauf demande explicite
- Le code doit être self-documenting
- **Exception** : Logique métier complexe nécessitant explication

## 🚫 À NE JAMAIS FAIRE

### Architecture
1. ❌ Bypass du Repository pattern (Lucid direct)
2. ❌ Créer migrations sans permission
3. ❌ Ignorer le container IoC
4. ❌ Créer des exceptions custom sans hiérarchie
5. ❌ Hard delete par défaut
6. ❌ Oublier le cache sur les read operations

### TDD & Tests
7. ❌ Implémenter sans écrire le test d'abord
8. ❌ Tester après implémentation (faire TDD inverse)
9. ❌ Commit sans que tous les tests passent
10. ❌ Ignorer un test qui échoue

### Clean Code
11. ❌ Utiliser `any` sans justification
12. ❌ Fonctions > 20 lignes sans refactoring
13. ❌ Noms non explicites (`d`, `u`, `calc`, `mgr`)
14. ❌ Plus de 4 paramètres dans une fonction
15. ❌ Mélanger les responsabilités dans une classe
16. ❌ Commentaires pour expliquer du code illisible

## 📚 Documentation de Référence

- [Architecture Overview](docs/architecture/overview.md)
- [Repository Pattern](docs/architecture/repository-pattern.md)
- [Authentication System](docs/features/authentication.md)

---

**Important** : Ces guidelines assurent la cohérence, performance et maintenabilité du codebase. Toujours les respecter dans les futures implémentations.