import type { DateTime } from 'luxon'

export interface CreateSessionData {
  userId: string
  ipAddress: string
  userAgent: string
  // Nouveaux champs optionnels
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
}

export interface EnrichedSessionData extends CreateSessionData {
  // Données enrichies automatiquement
  country?: string
  city?: string
  region?: string
  deviceType?: string
  os?: string
  browser?: string
}

export interface SessionData {
  id: string
  userId: string
  ipAddress: string
  userAgent: string
  startedAt: DateTime
  endedAt: DateTime | null
  lastActivity: DateTime
  isActive: boolean
  // Tous les nouveaux champs
  country: string | null
  city: string | null
  region: string | null
  deviceType: string | null
  os: string | null
  browser: string | null
  referrer: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  createdAt: DateTime
  updatedAt: DateTime
}
