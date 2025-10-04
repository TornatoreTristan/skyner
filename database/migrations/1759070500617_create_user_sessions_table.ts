// database/migrations/create_user_sessions_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_sessions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').references('users.id').onDelete('CASCADE').notNullable()
      table.string('ip_address').notNullable()
      table.text('user_agent').notNullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('ended_at').nullable()
      table.timestamp('last_activity').notNullable()
      table.boolean('is_active').defaultTo(true)

      // Géolocalisation
      table.string('country').nullable()
      table.string('city').nullable()
      table.string('region').nullable()

      // Appareil
      table.string('device_type').nullable() // mobile, desktop, tablet
      table.string('os').nullable() // Windows, macOS, iOS, Android
      table.string('browser').nullable() // Chrome, Safari, Firefox

      // Source
      table.string('referrer').nullable()
      table.string('utm_source').nullable()
      table.string('utm_medium').nullable()
      table.string('utm_campaign').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
