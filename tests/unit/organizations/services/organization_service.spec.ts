import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationService from '#organizations/services/organization_service'
import UserService from '#users/services/user_service'
import type { CreateOrganizationData } from '#shared/types/organization'
import type { CreateUserData } from '#shared/types/user'

test.group('OrganizationService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create organization with admin user', async ({ assert }) => {
    // Arrange - Créer un utilisateur
    const userData: CreateUserData = {
      email: 'admin@example.com',
      password: 'password123',
    }
    const user = await UserService.create(userData)

    // Act - Créer une organisation avec cet utilisateur comme admin
    const orgData: CreateOrganizationData = {
      name: 'Ma Super Entreprise',
      slug: 'ma-super-entreprise',
      description: 'Une entreprise innovante',
    }
    const organization = await OrganizationService.create(orgData, user.id)

    // Assert
    assert.exists(organization.id)
    assert.equal(organization.name, 'Ma Super Entreprise')
    assert.equal(organization.slug, 'ma-super-entreprise')
    assert.isTrue(organization.isActive)
  })

  test('should add user to organization with specific role', async ({ assert }) => {
    // Arrange - Créer une organisation et un utilisateur
    const adminUser = await UserService.create({
      email: 'admin@example.com',
      password: 'password123',
    })

    const memberUser = await UserService.create({
      email: 'member@example.com',
      password: 'password123',
    })

    const organization = await OrganizationService.create(
      {
        name: 'Test Org',
        slug: 'test-org',
      },
      adminUser.id
    )

    // Act - Ajouter un utilisateur comme member
    await OrganizationService.addUser(organization.id, memberUser.id, 'member')

    // Assert - Vérifier que l'utilisateur est bien ajouté avec le bon rôle
    const users = await OrganizationService.getUsers(organization.id)

    assert.equal(users.length, 2) // admin + member

    const member = users.find((u) => u.email === 'member@example.com')
    assert.exists(member)
    assert.equal(member!.role, 'member')
  })
})
