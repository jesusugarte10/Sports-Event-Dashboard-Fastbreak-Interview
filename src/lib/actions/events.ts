'use server'

import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/server'
import { safeAction } from './safe-action'
import { eventSchema, type EventFormData } from '@/lib/validators/event'
import { revalidatePath } from 'next/cache'

export async function listEventsAction(search?: string, sport?: string, dateFilter?: string, sortOption?: string) {
  return safeAction(async () => {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    const supabase = await createClient()
    let query = supabase
      .from('events')
      .select(`
        id,
        name,
        sport,
        starts_at,
        description,
        location,
        created_at,
        event_venues (
          venue:venues (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)

    // Search across multiple fields including venue names
    if (search) {
      // Escape special characters in two stages:
      // 1. Escape SQL ILIKE wildcards so they're treated as literal characters
      // 2. Escape PostgREST filter syntax characters
      
      // First, escape SQL ILIKE wildcards (% and _) by doubling them or using backslash
      // In PostgreSQL ILIKE, backslash escapes wildcards
      let escapedSearch = search
        .replace(/\\/g, '\\\\')  // Escape backslashes first (for both SQL and PostgREST)
        .replace(/%/g, '\\%')    // Escape % wildcard (matches any sequence)
        .replace(/_/g, '\\_')    // Escape _ wildcard (matches single character)
      
      // Then escape PostgREST filter syntax characters
      // Commas separate OR conditions, periods separate field.operator.value
      // Parentheses group conditions
      escapedSearch = escapedSearch
        .replace(/,/g, '\\,')    // Escape commas
        .replace(/\./g, '\\.')   // Escape periods
        .replace(/\(/g, '\\(')   // Escape opening parentheses
        .replace(/\)/g, '\\)')   // Escape closing parentheses
      
      // Find event IDs that have venues matching the search term
      // This allows searching by venue name across the related table
      const { data: matchingVenues } = await supabase
        .from('venues')
        .select('id')
        .ilike('name', `%${search}%`)
      
      const venueIds = matchingVenues?.map(v => v.id) || []
      
      // If we found matching venues, get the event IDs linked to them
      let eventIdsWithMatchingVenues: string[] = []
      if (venueIds.length > 0) {
        const { data: eventVenues } = await supabase
          .from('event_venues')
          .select('event_id')
          .in('venue_id', venueIds)
        
        eventIdsWithMatchingVenues = eventVenues?.map(ev => ev.event_id) || []
      }
      
      // Build the OR filter including venue matches
      let orFilter = `name.ilike.%${escapedSearch}%,sport.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,location.ilike.%${escapedSearch}%`
      
      // Add event IDs that have matching venues to the OR filter
      if (eventIdsWithMatchingVenues.length > 0) {
        // Add each matching event ID to the OR filter
        const idFilters = eventIdsWithMatchingVenues.map(id => `id.eq.${id}`).join(',')
        orFilter += `,${idFilters}`
      }
      
      query = query.or(orFilter)
    }

    // Filter by sport
    if (sport) {
      query = query.eq('sport', sport)
    }

    // Date filtering - use consistent UTC-based date boundaries
    // This ensures predictable behavior regardless of server timezone
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      
      // Helper to create start of day in UTC (00:00:00.000 UTC)
      const getStartOfDayUTC = (date: Date) => {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0))
      }
      
      // Helper to create end of day in UTC (23:59:59.999 UTC)
      const getEndOfDayUTC = (date: Date) => {
        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999))
      }
      
      switch (dateFilter) {
        case 'today': {
          const startOfDay = getStartOfDayUTC(now)
          const endOfDay = getEndOfDayUTC(now)
          query = query
            .gte('starts_at', startOfDay.toISOString())
            .lte('starts_at', endOfDay.toISOString())
          break
        }
        case 'week': {
          // Get start of current week (Sunday) in UTC using explicit Date.UTC construction
          // Note: Date.UTC() correctly normalizes out-of-range day values (0 or negative)
          // by wrapping to the previous month, so this handles month boundaries correctly
          const dayOfWeek = now.getUTCDay()
          const startOfWeekMs = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - dayOfWeek,
            0, 0, 0, 0
          )
          const startOfWeek = new Date(startOfWeekMs)
          
          // Get end of current week (Saturday) in UTC - 6 days after Sunday
          const endOfWeekMs = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - dayOfWeek + 6,
            23, 59, 59, 999
          )
          const endOfWeek = new Date(endOfWeekMs)
          
          query = query
            .gte('starts_at', startOfWeek.toISOString())
            .lte('starts_at', endOfWeek.toISOString())
          break
        }
        case 'month': {
          const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
          // Day 0 of next month = last day of current month
          const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))
          query = query
            .gte('starts_at', startOfMonth.toISOString())
            .lte('starts_at', endOfMonth.toISOString())
          break
        }
        case 'upcoming':
          query = query.gte('starts_at', now.toISOString())
          break
        case 'past':
          query = query.lt('starts_at', now.toISOString())
          break
      }
    }

    // Sorting
    const [sortField, sortDirection] = (sortOption || 'date-asc').split('-')
    const ascending = sortDirection === 'asc'
    
    if (sortField === 'date') {
      query = query.order('starts_at', { ascending })
    } else if (sortField === 'name') {
      query = query.order('name', { ascending })
    } else {
      query = query.order('starts_at', { ascending: true })
    }

    const { data, error } = await query

    if (error) {
      // Provide more context for Supabase errors
      const errorMessage = error.message || error.details || 'Database query failed'
      throw new Error(`Failed to fetch events: ${errorMessage}`)
    }

    return data.map((event) => ({
      id: event.id,
      name: event.name,
      sport: event.sport,
      startsAt: event.starts_at,
      description: event.description,
      location: event.location,
      createdAt: event.created_at,
      venues: (event.event_venues as any[])?.map((ev) => ev.venue) || [],
    }))
  })
}

export async function createEventAction(formData: EventFormData) {
  return safeAction(async () => {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    const validated = eventSchema.parse(formData)
    const supabase = await createClient()

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        name: validated.name,
        sport: validated.sport,
        starts_at: validated.dateTime,
        description: validated.description || null,
        location: validated.location || null,
      })
      .select()
      .single()

    if (eventError) throw eventError

    // Get or create venues
    const venueIds: string[] = []
    for (const venueName of validated.venueNames) {
      // Try to get existing venue
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id')
        .eq('name', venueName)
        .single()

      let venueId: string
      if (existingVenue) {
        venueId = existingVenue.id
      } else {
        // Create new venue
        const { data: newVenue, error: venueError } = await supabase
          .from('venues')
          .insert({ name: venueName })
          .select()
          .single()

        if (venueError) throw venueError
        venueId = newVenue.id
      }

      venueIds.push(venueId)
    }

    // Link venues to event
    const { error: linkError } = await supabase
      .from('event_venues')
      .insert(
        venueIds.map((venueId) => ({
          event_id: event.id,
          venue_id: venueId,
        }))
      )

    if (linkError) throw linkError

    revalidatePath('/dashboard')
    return event
  })
}

export async function updateEventAction(id: string, formData: EventFormData) {
  return safeAction(async () => {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    const validated = eventSchema.parse(formData)
    const supabase = await createClient()

    // Verify ownership
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingEvent) {
      throw new Error('Event not found or unauthorized')
    }

    // Update event
    const { error: eventError } = await supabase
      .from('events')
      .update({
        name: validated.name,
        sport: validated.sport,
        starts_at: validated.dateTime,
        description: validated.description || null,
        location: validated.location || null,
      })
      .eq('id', id)

    if (eventError) throw eventError

    // Delete existing venue links
    const { error: deleteError } = await supabase
      .from('event_venues')
      .delete()
      .eq('event_id', id)

    if (deleteError) throw deleteError

    // Get or create venues
    const venueIds: string[] = []
    for (const venueName of validated.venueNames) {
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id')
        .eq('name', venueName)
        .single()

      let venueId: string
      if (existingVenue) {
        venueId = existingVenue.id
      } else {
        const { data: newVenue, error: venueError } = await supabase
          .from('venues')
          .insert({ name: venueName })
          .select()
          .single()

        if (venueError) throw venueError
        venueId = newVenue.id
      }

      venueIds.push(venueId)
    }

    // Link venues to event
    const { error: linkError } = await supabase
      .from('event_venues')
      .insert(
        venueIds.map((venueId) => ({
          event_id: id,
          venue_id: venueId,
        }))
      )

    if (linkError) throw linkError

    revalidatePath('/dashboard')
    revalidatePath(`/events/${id}/edit`)
  })
}

export async function deleteEventAction(id: string) {
  return safeAction(async () => {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    const supabase = await createClient()

    // Verify ownership
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingEvent) {
      throw new Error('Event not found or unauthorized')
    }

    // Delete venue links (cascade should handle this, but being explicit)
    const { error: linkError } = await supabase
      .from('event_venues')
      .delete()
      .eq('event_id', id)

    if (linkError) throw linkError

    // Delete event
    const { error: eventError } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (eventError) throw eventError

    revalidatePath('/dashboard')
  })
}

export async function getEventAction(id: string) {
  return safeAction(async () => {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        name,
        sport,
        starts_at,
        description,
        location,
        event_venues (
          venue:venues (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) throw error
    if (!data) throw new Error('Event not found')

    return {
      id: data.id,
      name: data.name,
      sport: data.sport,
      dateTime: data.starts_at,
      description: data.description || '',
      location: data.location || '',
      venueNames: (data.event_venues as any[])?.map((ev) => ev.venue.name) || [],
    }
  })
}

