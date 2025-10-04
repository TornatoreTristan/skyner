import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'price_histories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      // Destination relationship (not flight, to track price evolution over time)
      table
        .integer('destination_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('destinations')
        .onDelete('CASCADE')

      // Price snapshot
      table.decimal('price', 10, 2).notNullable()
      table.string('currency', 3).notNullable()

      // When was this price scanned
      table.timestamp('scanned_at').notNullable()

      // Flight details at this moment (JSON: airline, stops, departure_date, etc.)
      table.json('metadata').nullable()

      // Index for performance (queries by destination + date)
      table.index(['destination_id', 'scanned_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
