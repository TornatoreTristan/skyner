import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class PasswordResetToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare usedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Vérifie si le token est expiré
   */
  public isExpired(): boolean {
    return DateTime.now() > this.expiresAt
  }

  /**
   * Vérifie si le token a déjà été utilisé
   */
  public isUsed(): boolean {
    return this.usedAt !== null
  }

  /**
   * Vérifie si le token est valide (non expiré et non utilisé)
   */
  public isValid(): boolean {
    return !this.isExpired() && !this.isUsed()
  }
}
