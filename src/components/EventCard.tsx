'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Calendar, MapPin, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { DeleteEventDialog } from './DeleteEventDialog'

type Venue = {
  id: string
  name: string
}

type EventCardProps = {
  id: string
  name: string
  sport: string
  startsAt: string
  description?: string | null
  location?: string | null
  venues: Venue[]
}

export function EventCard({ id, name, sport, startsAt, description, location, venues }: EventCardProps) {
  // Use useMemo to prevent hydration mismatches from Date comparisons
  const isUpcoming = React.useMemo(() => {
    try {
      return new Date(startsAt) > new Date()
    } catch {
      return false
    }
  }, [startsAt])
  
  // Format date safely to prevent hydration mismatches
  const formattedDate = React.useMemo(() => {
    try {
      return format(new Date(startsAt), 'PPP p')
    } catch {
      return startsAt
    }
  }, [startsAt])
  
  return (
    <Card className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-primary/10 hover:border-primary/30 bg-gradient-to-br from-card to-card/50 flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
              {name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{formattedDate}</span>
            </CardDescription>
          </div>
          <Badge 
            variant={isUpcoming ? "default" : "secondary"} 
            className="ml-2 flex-shrink-0 font-semibold"
          >
            {sport}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-0 flex-1">
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        {location && (
          <div className="flex items-start gap-2 pt-1">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-foreground/80 line-clamp-1">{location}</span>
          </div>
        )}
        {venues.length > 0 && (
          <div className="flex items-start gap-2 pt-1">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              {venues.map((venue) => (
                <Badge 
                  key={venue.id} 
                  variant="outline" 
                  className="text-xs border-primary/20 hover:border-primary/40 transition-colors"
                >
                  {venue.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 pt-3 mt-auto border-t border-primary/10">
        <Button 
          asChild 
          variant="outline" 
          size="sm" 
          className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Link href={`/events/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
        <DeleteEventDialog eventId={id} eventName={name}>
          <Button 
            variant="destructive" 
            size="sm" 
            className="flex-1 hover:bg-destructive/90 transition-colors"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DeleteEventDialog>
      </CardFooter>
    </Card>
  )
}

