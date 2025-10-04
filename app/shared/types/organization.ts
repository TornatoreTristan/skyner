import type { DateTime } from 'luxon'

export interface CreateOrganizationData {
  name: string
  slug: string
  description?: string
  website?: string
}

export interface OrganizationData {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
}

export interface UserOrganizationRole {
  organizationId: string
  userId: string
  role: 'admin' | 'member' | 'viewer'
  joinedAt: DateTime
}

export type OrganizationRole = 'admin' | 'member' | 'viewer'
