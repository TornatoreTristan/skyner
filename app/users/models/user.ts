import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Organization from '#organizations/models/organization'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string | null

  @column()
  declare googleId: string | null

  @column()
  declare avatarUrl: string | null

  @column.dateTime()
  declare emailVerifiedAt: DateTime | null

  @column.dateTime()
  declare deleted_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Getters
  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null
  }

  @manyToMany(() => Organization, {
    pivotTable: 'user_organizations',
    pivotColumns: ['role', 'joined_at'],
    pivotTimestamps: true,
  })
  declare organizations: ManyToMany<typeof Organization>
}
