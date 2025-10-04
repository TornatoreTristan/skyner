import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#users/models/user'
import Flight from '#flights/models/flight'
import PriceHistory from '#flights/models/price_history'

interface DestinationPreferences {
  airlines?: string[]
  maxStops?: number
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first'
  directFlightsOnly?: boolean
}

export default class Destination extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: string

  @column()
  declare origin: string

  @column()
  declare destination: string

  @column.date()
  declare departureDate: DateTime

  @column.date()
  declare returnDate: DateTime | null

  @column()
  declare flexibility: number

  @column()
  declare maxBudget: number | null

  @column()
  declare currency: string

  @column()
  declare adults: number

  @column()
  declare children: number

  @column({
    prepare: (value: DestinationPreferences) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare preferences: DestinationPreferences | null

  @column.dateTime({ columnName: 'deleted_at' })
  declare deletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Flight)
  declare flights: HasMany<typeof Flight>

  @hasMany(() => PriceHistory)
  declare priceHistories: HasMany<typeof PriceHistory>

  get isRoundTrip(): boolean {
    return this.returnDate !== null
  }

  get totalPassengers(): number {
    return this.adults + this.children
  }
}
