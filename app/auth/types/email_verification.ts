import type { DateTime } from 'luxon'

export type VerificationType = 'registration' | 'email_change'

export interface CreateVerificationTokenData {
  userId: string
  email: string
  type: VerificationType
  token: string
  expiresAt: DateTime
}

export interface VerificationResult {
  success: boolean
  userId?: string
  email?: string
  error?: string
}

export interface RequestEmailChangeData {
  userId: string
  newEmail: string
  password: string
}
