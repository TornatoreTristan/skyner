import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#users/models/user'
import type { VerificationType } from '#auth/types/email_verification'

export default class EmailVerificationToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare email: string

  @column()
  declare token: string

  @column()
  declare type: VerificationType

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Getters
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  get isVerified(): boolean {
    return !!this.verifiedAt
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isVerified
  }
}
