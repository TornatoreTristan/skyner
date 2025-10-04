import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Destination from '#destinations/models/destination'

interface PriceHistoryMetadata {
  airline?: string
  stops?: number
  departureDate?: string
  returnDate?: string
  source?: string
}

export default class PriceHistory extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare destinationId: number

  @column()
  declare price: number

  @column()
  declare currency: string

  @column.dateTime()
  declare scannedAt: DateTime

  @column({
    prepare: (value: PriceHistoryMetadata) => JSON.stringify(value),
    consume: (value: string) => JSON.parse(value),
  })
  declare metadata: PriceHistoryMetadata | null

  @belongsTo(() => Destination)
  declare destination: BelongsTo<typeof Destination>
}
