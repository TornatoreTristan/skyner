import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#users/models/user'

export default class UserSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare ipAddress: string

  @column()
  declare userAgent: string

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @column.dateTime()
  declare lastActivity: DateTime

  @column()
  declare isActive: boolean

  // Géolocalisation
  @column()
  declare country: string | null

  @column()
  declare city: string | null

  @column()
  declare region: string | null

  // Appareil
  @column()
  declare deviceType: string | null

  @column()
  declare os: string | null

  @column()
  declare browser: string | null

  // Source
  @column()
  declare referrer: string | null

  @column()
  declare utmSource: string | null

  @column()
  declare utmMedium: string | null

  @column()
  declare utmCampaign: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
