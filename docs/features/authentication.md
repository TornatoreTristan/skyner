# 🔐 Authentication System

Le système d'authentification de ce boilerplate offre une solution complète et sécurisée avec sessions, middleware de protection, et tracking avancé.

## 🎯 Vue d'Ensemble

### Fonctionnalités
- ✅ **Login/Logout** avec sessions sécurisées
- ✅ **Session tracking** avec audit et analytics
- ✅ **Middleware d'authentification** robuste
- ✅ **Password reset** avec tokens sécurisés
- ✅ **Remember me** functionality
- ✅ **UTM & Referrer tracking** pour l'analytics
- ✅ **Multi-device session management**

### Architecture
```
Controllers ← Services ← Repositories ← Models
     ↕            ↕           ↕          ↕
Middleware ← Cache ← EventBus ← Database
```

## 🏗️ Structure des Modules

```
app/auth/
├── controllers/
│   ├── auth_controller.ts           # Login/logout
│   └── password_reset_controller.ts # Récupération mot de passe
├── middleware/
│   ├── auth_middleware.ts           # Protection des routes
│   └── update_session_activity.ts   # Tracking activité
├── services/
│   ├── auth_service.ts              # Logique authentification
│   └── password_reset_service.ts    # Logique reset password
└── repositories/
    └── password_reset_repository.ts # Gestion tokens reset
```

## 🚀 AuthController

### Login Endpoint
```typescript
// POST /auth/login
export default class AuthController {
  async login({ request, response, session }: HttpContext) {
    const authService = getService<AuthService>(TYPES.AuthService)
    const sessionService = getService<SessionService>(TYPES.SessionService)

    const { email, password, remember = false } = await request.validateUsing(loginValidator)

    // Authentification
    const user = await authService.login(email, password)

    // Création session avec tracking
    const sessionData = await sessionService.createSession({
      userId: user.id,
      userAgent: request.header('user-agent'),
      ipAddress: request.ip(),
      remember,
      utmSource: request.input('utm_source'),
      utmMedium: request.input('utm_medium'),
      utmCampaign: request.input('utm_campaign'),
      referrer: request.header('referer')
    })

    // Configuration session AdonisJS
    session.put('user_id', user.id)
    session.put('session_id', sessionData.id)

    if (remember) {
      session.commit() // Session persistante
    }

    return response.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      }
    })
  }
}
```

### Logout Endpoint
```typescript
// POST /auth/logout
async logout({ session, response }: HttpContext) {
  const sessionService = getService<SessionService>(TYPES.SessionService)
  const sessionId = session.get('session_id')

  if (sessionId) {
    // Marquer la session comme terminée
    await sessionService.endSession(sessionId)
  }

  // Destruction session AdonisJS
  session.clear()

  return response.json({ message: 'Logout successful' })
}
```

## 🔧 AuthService

### Service Principal
```typescript
@injectable()
export default class AuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.CacheService) private cache: CacheService
  ) {}

  async login(email: string, password: string): Promise<User> {
    // Validation format email
    E.validateEmail(email)

    // Recherche utilisateur
    const user = await this.userRepo.findByEmail(email)
    E.assertUserExists(user, email)

    // Vérification mot de passe
    const isValidPassword = await hash.verify(user.password, password)
    E.assertValidPassword(isValidPassword)

    // Cache user pour performances
    await this.cache.set(`user:${user.id}`, user, {
      ttl: 1800, // 30 minutes
      tags: [`user_${user.id}`, 'authenticated_users']
    })

    return user
  }

  async getCurrentUser(userId: string): Promise<User> {
    // Tentative depuis le cache
    const cached = await this.cache.get<User>(`user:${userId}`)
    if (cached) return cached

    // Fallback base de données
    const user = await this.userRepo.findById(userId)
    E.assertUserExists(user, userId)

    // Mise en cache
    await this.cache.set(`user:${userId}`, user, {
      ttl: 1800,
      tags: [`user_${user.id}`, 'authenticated_users']
    })

    return user
  }
}
```

## 🛡️ Middleware d'Authentification

### AuthMiddleware
```typescript
export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { session, response } = ctx

    // Vérification session
    const userId = session.get('user_id')
    if (!userId) {
      return response.unauthorized({ message: 'Authentication required' })
    }

    try {
      // Chargement utilisateur (avec cache)
      const authService = getService<AuthService>(TYPES.AuthService)
      const user = await authService.getCurrentUser(userId)

      // Injection dans le contexte
      ctx.user = user

      await next()
    } catch (error) {
      // Session invalide, nettoyage
      session.clear()
      return response.unauthorized({ message: 'Invalid session' })
    }
  }
}
```

### UpdateSessionActivity Middleware
```typescript
export default class UpdateSessionActivityMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { session } = ctx
    const sessionId = session.get('session_id')

    if (sessionId) {
      // Mise à jour asynchrone de l'activité
      const sessionService = getService<SessionService>(TYPES.SessionService)

      // Fire & forget - pas d'attente
      sessionService.updateActivity(sessionId, {
        lastActivity: DateTime.now(),
        lastRoute: ctx.route?.name || ctx.request.url(),
        lastIp: ctx.request.ip()
      }).catch(console.error)
    }

    await next()
  }
}
```

## 📊 Session Tracking

### SessionService
```typescript
@injectable()
export default class SessionService {
  constructor(
    @inject(TYPES.SessionRepository) private sessionRepo: SessionRepository,
    @inject(TYPES.EventBus) private eventBus: EventBusService
  ) {}

  async createSession(data: CreateSessionData): Promise<Session> {
    const session = await this.sessionRepo.create({
      userId: data.userId,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      isActive: true,
      remember: data.remember,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      referrer: data.referrer,
      lastActivity: DateTime.now()
    })

    // Événement pour analytics
    await this.eventBus.emit('session.created', {
      session,
      userId: data.userId
    })

    return session
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findByIdOrFail(sessionId)

    await this.sessionRepo.update(sessionId, {
      isActive: false,
      endedAt: DateTime.now()
    })

    // Événement pour analytics
    await this.eventBus.emit('session.ended', {
      sessionId,
      userId: session.userId,
      duration: this.calculateDuration(session)
    })
  }

  async updateActivity(sessionId: string, data: UpdateActivityData): Promise<void> {
    await this.sessionRepo.update(sessionId, data)
  }
}
```

### Modèle Session
```typescript
export default class Session extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare userAgent: string | null

  @column()
  declare ipAddress: string

  @column()
  declare isActive: boolean

  @column()
  declare remember: boolean

  @column()
  declare utmSource: string | null

  @column()
  declare utmMedium: string | null

  @column()
  declare utmCampaign: string | null

  @column()
  declare referrer: string | null

  @column()
  declare lastRoute: string | null

  @column()
  declare lastIp: string | null

  @column.dateTime()
  declare lastActivity: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

## 🔄 Password Reset

### PasswordResetController
```typescript
export default class PasswordResetController {
  // POST /password/forgot
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    const passwordResetService = getService<PasswordResetService>(TYPES.PasswordResetService)

    try {
      await passwordResetService.createResetToken(email)

      // Toujours succès pour éviter énumération emails
      return response.json({
        message: 'If email exists, reset instructions have been sent'
      })
    } catch (error) {
      // Log l'erreur mais retourne succès
      console.error('Password reset error:', error)
      return response.json({
        message: 'If email exists, reset instructions have been sent'
      })
    }
  }

  // POST /password/reset
  async resetPassword({ request, response }: HttpContext) {
    const { token, password, password_confirmation } = await request.validateUsing(resetPasswordValidator)

    const passwordResetService = getService<PasswordResetService>(TYPES.PasswordResetService)

    await passwordResetService.resetPassword(token, password)

    return response.json({
      message: 'Password reset successful'
    })
  }
}
```

### PasswordResetService
```typescript
@injectable()
export default class PasswordResetService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: UserRepository,
    @inject(TYPES.PasswordResetRepository) private resetRepo: PasswordResetRepository,
    @inject(TYPES.EventBus) private eventBus: EventBusService
  ) {}

  async createResetToken(email: string): Promise<void> {
    // Vérifier si l'utilisateur existe
    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Nettoyer les anciens tokens
    await this.resetRepo.deleteByEmail(email)

    // Créer nouveau token
    const token = string.generateRandom(64)
    const expiresAt = DateTime.now().plus({ hours: 1 })

    await this.resetRepo.create({
      email,
      token,
      expiresAt,
      used: false
    })

    // Événement pour envoi email
    await this.eventBus.emit('password.reset_requested', {
      email,
      token,
      user
    })
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validation token
    const resetToken = await this.resetRepo.findByToken(token)
    if (!resetToken) {
      throw new ValidationException('Invalid or expired token')
    }

    if (resetToken.used) {
      throw new ValidationException('Token already used')
    }

    if (resetToken.expiresAt < DateTime.now()) {
      throw new ValidationException('Token expired')
    }

    // Récupérer utilisateur
    const user = await this.userRepo.findByEmail(resetToken.email)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Mettre à jour mot de passe
    const hashedPassword = await hash.make(newPassword)
    await this.userRepo.update(user.id, { password: hashedPassword })

    // Marquer token comme utilisé
    await this.resetRepo.markAsUsed(resetToken.id)

    // Invalider cache utilisateur
    await this.cache.invalidateTags([`user_${user.id}`, 'authenticated_users'])

    // Événement pour analytics
    await this.eventBus.emit('password.reset_completed', {
      userId: user.id,
      email: user.email
    })
  }
}
```

## 🔒 Sécurité

### Validation des Données
```typescript
// Validators avec Vine
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(6),
    remember: vine.boolean().optional()
  })
)

export const resetPasswordValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(32),
    password: vine.string().minLength(8),
    password_confirmation: vine.string().sameAs('password')
  })
)
```

### Protection CSRF
```typescript
// Middleware automatique AdonisJS
// Configuration dans config/shield.ts
export const shieldConfig = defineConfig({
  csrf: {
    enabled: true,
    exceptRoutes: ['/api/*'], // API sans CSRF
    enableXsrfCookie: true
  }
})
```

### Rate Limiting
```typescript
// Dans start/kernel.ts pour routes sensibles
router.group(() => {
  router.post('/login', 'AuthController.login')
  router.post('/password/forgot', 'PasswordResetController.forgotPassword')
}).middleware(['throttle:10,1']) // 10 req/min
```

## 📱 API Usage Examples

### Login
```bash
curl -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "remember": true
  }'
```

### Logout
```bash
curl -X POST http://localhost:3333/auth/logout \
  -H "Cookie: adonis-session=..." \
  -H "Content-Type: application/json"
```

### Password Reset
```bash
# Request reset
curl -X POST http://localhost:3333/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Reset with token
curl -X POST http://localhost:3333/password/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_here",
    "password": "newpassword123",
    "password_confirmation": "newpassword123"
  }'
```

## 🧪 Testing

### Test d'Authentification
```typescript
test('should login with valid credentials', async ({ client, assert }) => {
  // Arrange
  const userData = {
    email: 'test@example.com',
    password: 'password123'
  }

  // Créer utilisateur test
  const user = await User.create({
    ...userData,
    password: await hash.make(userData.password)
  })

  // Act
  const response = await client.post('/auth/login').json({
    email: userData.email,
    password: userData.password,
    remember: false
  })

  // Assert
  response.assertStatus(200)
  response.assertBodyContains({
    message: 'Login successful',
    user: { email: userData.email }
  })

  // Vérifier session
  assert.exists(response.session().get('user_id'))
})
```

## 🎯 Avantages du Système

### Sécurité
- **Hashing sécurisé** avec Argon2
- **Protection CSRF** intégrée
- **Rate limiting** sur endpoints sensibles
- **Validation stricte** des données

### Performance
- **Cache Redis** pour les utilisateurs authentifiés
- **Sessions optimisées** avec mise à jour asynchrone
- **Lazy loading** des données utilisateur

### Analytics
- **Tracking UTM** pour attribution marketing
- **Audit trail** complet des sessions
- **Métriques** d'engagement utilisateur

### Maintenabilité
- **Architecture modulaire** par domaine
- **Tests complets** avec mocks
- **Documentation** intégrée

---

Ce système d'authentification offre une base robuste et extensible pour vos applications d'entreprise avec un focus sur la sécurité et la performance.