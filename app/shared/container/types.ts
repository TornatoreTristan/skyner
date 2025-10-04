/**
 * Types pour l'injection de dépendances
 * Utilisation d'un objet pour éviter les conflits de noms
 */
export const TYPES = {
  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  OrganizationRepository: Symbol.for('OrganizationRepository'),
  SessionRepository: Symbol.for('SessionRepository'),
  PasswordResetRepository: Symbol.for('PasswordResetRepository'),
  EmailVerificationRepository: Symbol.for('EmailVerificationRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  UploadRepository: Symbol.for('UploadRepository'),
  DestinationRepository: Symbol.for('DestinationRepository'),
  FlightRepository: Symbol.for('FlightRepository'),
  PriceHistoryRepository: Symbol.for('PriceHistoryRepository'),

  // Services
  UserService: Symbol.for('UserService'),
  AuthService: Symbol.for('AuthService'),
  OrganizationService: Symbol.for('OrganizationService'),
  SessionService: Symbol.for('SessionService'),
  PasswordResetService: Symbol.for('PasswordResetService'),
  EmailVerificationService: Symbol.for('EmailVerificationService'),
  GoogleAuthService: Symbol.for('GoogleAuthService'),
  NotificationService: Symbol.for('NotificationService'),
  UploadService: Symbol.for('UploadService'),
  StorageService: Symbol.for('StorageService'),
  LocalStorageDriver: Symbol.for('LocalStorageDriver'),
  S3StorageDriver: Symbol.for('S3StorageDriver'),
  DestinationService: Symbol.for('DestinationService'),
  FlightService: Symbol.for('FlightService'),
  FlightSearchService: Symbol.for('FlightSearchService'),
  PriceHistoryService: Symbol.for('PriceHistoryService'),

  // Infrastructure
  CacheService: Symbol.for('CacheService'),
  EventBus: Symbol.for('EventBus'),
  QueueService: Symbol.for('QueueService'),
  Logger: Symbol.for('Logger'),
  RateLimitService: Symbol.for('RateLimitService'),
  EmailService: Symbol.for('EmailService'),

  // External services
  RedisClient: Symbol.for('RedisClient'),
  AmadeusClient: Symbol.for('AmadeusClient'),
} as const

export type ServiceType = keyof typeof TYPES