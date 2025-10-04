import 'reflect-metadata'
import { Container } from 'inversify'
import Redis from 'ioredis'
import Queue from 'bull'
import logger from '@adonisjs/core/services/logger'
import app from '@adonisjs/core/services/app'
import { TYPES } from './types.js'

// Services
import CacheService from '#shared/services/cache_service'
import EventBusService from '#shared/services/event_bus_service'
import QueueService from '#shared/services/queue_service'
import RateLimitService from '#shared/services/rate_limit_service'
import EmailService from '#mailing/services/email_service'

// Repositories
import UserRepository from '#users/repositories/user_repository'
import OrganizationRepository from '#organizations/repositories/organization_repository'
import SessionRepository from '#sessions/repositories/session_repository'
import EmailVerificationRepository from '#auth/repositories/email_verification_repository'
import NotificationRepository from '#notifications/repositories/notification_repository'
import UploadRepository from '#uploads/repositories/upload_repository'

// Upload Services
import StorageService from '#uploads/services/storage_service'
import LocalStorageDriver from '#uploads/services/storage/local_storage_driver'
import S3StorageDriver from '#uploads/services/storage/s3_storage_driver'
import UploadService from '#uploads/services/upload_service'

// Domain Services
import SessionService from '#sessions/services/session_service'
import GoogleAuthService from '#auth/services/google_auth_service'
import EmailVerificationService from '#auth/services/email_verification_service'
import NotificationService from '#notifications/services/notification_service'

// Create container
const container = new Container()

/**
 * Configuration du container IoC
 */
export function configureContainer(): Container {
  // ==========================================
  // INFRASTRUCTURE
  // ==========================================

  // Redis client
  container.bind<Redis>(TYPES.RedisClient).toDynamicValue(() => {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    }

    return new Redis(redisConfig)
  }).inSingletonScope()

  // Logger
  container.bind(TYPES.Logger).toConstantValue(logger)

  // Cache Service
  container.bind<CacheService>(TYPES.CacheService).to(CacheService).inSingletonScope()

  // Queue Service
  container.bind<QueueService>(TYPES.QueueService).to(QueueService).inSingletonScope()

  // Event Bus
  container.bind<EventBusService>(TYPES.EventBus).to(EventBusService).inSingletonScope()

  // Rate Limit Service
  container.bind<RateLimitService>(TYPES.RateLimitService).to(RateLimitService).inSingletonScope()

  // Email Service
  container.bind<EmailService>(TYPES.EmailService).to(EmailService).inSingletonScope()

  // ==========================================
  // REPOSITORIES
  // ==========================================

  container.bind(TYPES.UserRepository).to(UserRepository)
  container.bind(TYPES.OrganizationRepository).to(OrganizationRepository)
  container.bind(TYPES.SessionRepository).to(SessionRepository)
  container.bind(TYPES.EmailVerificationRepository).to(EmailVerificationRepository)
  container.bind(TYPES.NotificationRepository).to(NotificationRepository)
  container.bind(TYPES.UploadRepository).to(UploadRepository)

  // ==========================================
  // DOMAIN SERVICES
  // ==========================================

  container.bind<SessionService>(TYPES.SessionService).to(SessionService)
  container.bind<GoogleAuthService>(TYPES.GoogleAuthService).to(GoogleAuthService)
  container.bind<EmailVerificationService>(TYPES.EmailVerificationService).to(EmailVerificationService)
  container.bind<NotificationService>(TYPES.NotificationService).to(NotificationService)

  // ==========================================
  // UPLOAD SERVICES
  // ==========================================

  container.bind<LocalStorageDriver>(TYPES.LocalStorageDriver).to(LocalStorageDriver).inSingletonScope()
  container.bind<S3StorageDriver>(TYPES.S3StorageDriver).to(S3StorageDriver).inSingletonScope()
  container.bind<StorageService>(TYPES.StorageService).to(StorageService).inSingletonScope()
  container.bind<UploadService>(TYPES.UploadService).to(UploadService)

  return container
}

// Export du container configuré
export const serviceContainer = configureContainer()

// Helper pour récupérer un service
export function getService<T>(serviceIdentifier: symbol): T {
  return serviceContainer.get<T>(serviceIdentifier)
}

// Helper pour checker si l'app est en test
export function isTestEnvironment(): boolean {
  return app.inTest
}