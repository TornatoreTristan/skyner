import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'destinations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // User relationship
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Flight search criteria
      table.string('origin', 3).notNullable()
      table.string('destination', 3).notNullable()
      table.date('departure_date').notNullable()
      table.date('return_date').nullable()
      table.integer('flexibility').defaultTo(0)

      // Budget & passengers
      table.decimal('max_budget', 10, 2).nullable()
      table.string('currency', 3).defaultTo('EUR')
      table.integer('adults').defaultTo(1)
      table.integer('children').defaultTo(0)

      // Preferences (JSON: airlines, max_stops, cabin_class, etc.)
      table.json('preferences').nullable()

      // Soft delete
      table.timestamp('deleted_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
