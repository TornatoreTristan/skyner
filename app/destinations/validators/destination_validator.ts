import vine from '@vinejs/vine'

export const createDestinationValidator = vine.compile(
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
    flexibility: vine.number().min(0).max(14).optional(),
    maxBudget: vine.number().min(0).optional(),
    currency: vine
      .string()
      .fixedLength(3)
      .regex(/^[A-Z]{3}$/)
      .optional(),
    adults: vine.number().min(1).max(9).optional(),
    children: vine.number().min(0).max(8).optional(),
    preferences: vine
      .object({
        airlines: vine.array(vine.string()).optional(),
        maxStops: vine.number().min(0).max(3).optional(),
        cabinClass: vine.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
        directFlightsOnly: vine.boolean().optional(),
      })
      .optional(),
  })
)

export const updateDestinationValidator = vine.compile(
  vine.object({
    origin: vine
      .string()
      .fixedLength(3)
      .regex(/^[A-Z]{3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    destination: vine
      .string()
      .fixedLength(3)
      .regex(/^[A-Z]{3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    departureDate: vine
      .date({
        formats: ['YYYY-MM-DD', 'ISO'],
      })
      .optional(),
    returnDate: vine
      .date({
        formats: ['YYYY-MM-DD', 'ISO'],
      })
      .optional(),
    flexibility: vine.number().min(0).max(14).optional(),
    maxBudget: vine.number().min(0).optional(),
    currency: vine
      .string()
      .fixedLength(3)
      .regex(/^[A-Z]{3}$/)
      .optional(),
    adults: vine.number().min(1).max(9).optional(),
    children: vine.number().min(0).max(8).optional(),
    preferences: vine
      .object({
        airlines: vine.array(vine.string()).optional(),
        maxStops: vine.number().min(0).max(3).optional(),
        cabinClass: vine.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
        directFlightsOnly: vine.boolean().optional(),
      })
      .optional(),
  })
)
