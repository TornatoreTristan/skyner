import vine from '@vinejs/vine'

/**
 * Validator pour la demande de changement d'email
 */
export const requestEmailChangeValidator = vine.compile(
  vine.object({
    newEmail: vine.string().email().normalizeEmail().trim(),
    password: vine.string().minLength(8).maxLength(255),
  })
)
