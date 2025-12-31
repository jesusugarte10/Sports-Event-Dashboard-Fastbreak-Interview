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

    // Search across multiple fields
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sport.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`
      )
    }

    // Filter by sport
    if (sport) {
      query = query.eq('sport', sport)
    }

    // Date filtering
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
      
      switch (dateFilter) {
        case 'today':
          query = query
            .gte('starts_at', startOfDay.toISOString())
            .lte('starts_at', endOfDay.toISOString())
          break
        case 'week': {
          const dayOfWeek = now.getDay()
          const startOfWeek = new Date(startOfDay.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
          const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
          query = query
            .gte('starts_at', startOfWeek.toISOString())
            .lte('starts_at', endOfWeek.toISOString())
          break
        }
        case 'month': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
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

