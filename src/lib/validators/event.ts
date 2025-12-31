import { z } from 'zod'

export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200),
  sport: z.string().min(1, 'Sport type is required').max(100),
  dateTime: z.string().refine(
    (val) => {
      if (!val) return false
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string
      const date = new Date(val)
      return !isNaN(date.getTime())
    },
    { message: 'Invalid date format' }
  ).transform((val) => {
    // Convert to ISO string for database storage
    return new Date(val).toISOString()
  }),
  description: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  venueNames: z.array(z.string().min(1, 'Venue name cannot be empty')).min(1, 'At least one venue is required'),
})

export type EventFormData = z.infer<typeof eventSchema>

