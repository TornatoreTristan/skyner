// database/migrations/create_user_organizations_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_organizations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()
      table.uuid('organization_id').references('organizations.id').onDelete('CASCADE').notNullable()
      table.enum('role', ['admin', 'member', 'viewer']).notNullable().defaultTo('member')
      table.timestamp('joined_at').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Un utilisateur ne peut avoir qu'un seul rôle par organisation
      table.unique(['user_id', 'organization_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
