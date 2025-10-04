import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'flights'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // Destination relationship
      table
        .integer('destination_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('destinations')
        .onDelete('CASCADE')

      // Flight details
      table.string('airline').notNullable()
      table.decimal('price', 10, 2).notNullable()
      table.string('currency', 3).notNullable()
      table.timestamp('departure_date').notNullable()
      table.timestamp('return_date').nullable()

      // Flight info
      table.integer('stops').defaultTo(0)
      table.integer('duration').nullable() // Total duration in minutes
      table.text('booking_url').nullable()

      // Source API
      table.string('source').defaultTo('amadeus') // amadeus, skyscanner, kiwi, etc.

      // Additional metadata (JSON: departure airport, arrival times, segments, etc.)
      table.json('metadata').nullable()

      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
