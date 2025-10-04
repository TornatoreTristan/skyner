import Organization from '#organizations/models/organization'
import type {
  CreateOrganizationData,
  OrganizationData,
  OrganizationRole,
} from '#shared/types/organization'

export default class OrganizationService {
  static async create(
    organizationData: CreateOrganizationData,
    adminUserId: string
  ): Promise<OrganizationData> {
    // Créer l'organisation
    const organization = await Organization.create({
      name: organizationData.name,
      slug: organizationData.slug,
      description: organizationData.description || null,
      website: organizationData.website || null,
      isActive: true,
    })

    // Attacher l'utilisateur comme admin
    await organization.related('users').attach({
      [adminUserId]: {
        role: 'admin',
        joined_at: new Date(),
      },
    })

    return organization
  }

  static async addUser(
    organizationId: string,
    userId: string,
    role: OrganizationRole
  ): Promise<void> {
    const organization = await Organization.findOrFail(organizationId)

    await organization.related('users').attach({
      [userId]: {
        role,
        joined_at: new Date(),
      },
    })
  }

  static async getUsers(organizationId: string) {
    const organization = await Organization.query()
      .where('id', organizationId)
      .preload('users', (query) => {
        query.pivotColumns(['role', 'joined_at'])
      })
      .firstOrFail()

    return organization.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: (user as any).$extras.pivot_role,
      joinedAt: (user as any).$extras.pivot_joined_at,
    }))
  }
}
