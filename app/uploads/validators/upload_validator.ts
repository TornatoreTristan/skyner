import vine from '@vinejs/vine'

export const uploadFileValidator = vine.compile(
  vine.object({
    file: vine.any(),
    disk: vine.enum(['local', 's3']).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    uploadableType: vine.string().optional(),
    uploadableId: vine.string().uuid().optional(),
  })
)

export const getUploadsValidator = vine.compile(
  vine.object({
    disk: vine.enum(['local', 's3']).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    uploadableType: vine.string().optional(),
    uploadableId: vine.string().uuid().optional(),
  })
)
