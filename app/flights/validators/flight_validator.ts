import vine from '@vinejs/vine'

export const searchFlightsValidator = vine.compile(
  vine.object({
    origin: vine
      .string()
      .fixedLength(3)
      .regex(/^[A-Z]{3}$/)
      .transform((value) => value.toUpperCase()),
    destination: vine
      .string()
      .fixedLength(3)
      .regex(/^[A-Z]{3}$/)
      .transform((value) => value.toUpperCase()),
    departureDate: vine.date({
      formats: ['YYYY-MM-DD', 'ISO'],
    }),
    returnDate: vine
      .date({
        formats: ['YYYY-MM-DD', 'ISO'],
      })
      .optional(),
    adults: vine.number().min(1).max(9).optional(),
    children: vine.number().min(0).max(8).optional(),
    maxResults: vine.number().min(1).max(100).optional(),
  })
)

export const searchForDestinationValidator = vine.compile(
  vine.object({
    destinationId: vine.number().positive(),
    saveToDatabase: vine.boolean().optional(),
    recordPriceHistory: vine.boolean().optional(),
    maxResults: vine.number().min(1).max(100).optional(),
  })
)
