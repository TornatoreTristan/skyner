import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Destination from '#destinations/models/destination'

interface FlightMetadata {
  departureAirport?: string
  arrivalAirport?: string
  departureTime?: string
  arrivalTime?: string
  segments?: Array<{
    airline: string
    flightNumber: string
    departure: string
    arrival: string
    duration: number
  }>
}

export default class Flight extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare destinationId: number

  @column()
  declare airline: string

  @column()
  declare price: number

  @column()
  declare currency: string

  @column.dateTime()
  declare departureDate: DateTime

  @column.dateTime()
  declare returnDate: DateTime | null

  @column()
  declare stops: number

  @column()
  declare duration: number | null

  @column()
  declare bookingUrl: string | null

  @column()
  declare source: string

  @column({
    prepare: (value: FlightMetadata) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare metadata: FlightMetadata | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Destination)
  declare destination: BelongsTo<typeof Destination>

  get isDirect(): boolean {
    return this.stops === 0
  }

  get durationHours(): number | null {
    return this.duration ? Math.floor(this.duration / 60) : null
  }

  get durationMinutes(): number | null {
    return this.duration ? this.duration % 60 : null
  }
}
