import { listEventsAction } from '@/lib/actions/events'
import { EventCard } from '@/components/EventCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Calendar } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { DashboardClient } from './DashboardClient'
import { AIEventCreator } from '@/components/AIEventCreator'

type DashboardPageProps = {
  searchParams: Promise<{
    search?: string
    sport?: string
  }>
}

const SPORTS = [
  'Basketball',
  'Football',
  'Soccer',
  'Baseball',
  'Tennis',
  'Volleyball',
  'Hockey',
  'Pickleball',
  'Other',
]

function EventListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border border-primary/10 bg-card/50 p-6">
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  )
}

async function EventList({ search, sport }: { search?: string; sport?: string }) {
  const result = await listEventsAction(search, sport)

  if (!result.ok) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-destructive font-medium">{result.error}</p>
        {result.error?.includes('Database tables not found') && (
          <p className="text-sm text-muted-foreground">
            Go to your Supabase dashboard → SQL Editor and run the schema from{' '}
            <code className="text-xs bg-muted px-2 py-1 rounded">supabase/schema.sql</code>
          </p>
        )}
      </div>
    )
  }

  const events = result.data || []

  if (events.length === 0) {
    return (
      <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No events found</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            {search || sport
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first sports event'}
          </p>
          <div className="flex gap-3">
            <AIEventCreator />
            <Button asChild variant="outline">
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          name={event.name}
          sport={event.sport}
          startsAt={event.startsAt}
          description={event.description}
          location={event.location}
          venues={event.venues}
        />
      ))}
    </div>
  )
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const search = params.search
  const sport = params.sport

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Events Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your sports events and venues
          </p>
        </div>
        <div className="flex gap-2 ml-auto">
          <AIEventCreator />
          <Button asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <DashboardClient initialSearch={search} initialSport={sport} sports={SPORTS} />

      {/* Events List */}
      <Suspense key={`${search}-${sport}`} fallback={<EventListSkeleton />}>
        <EventList search={search} sport={sport} />
      </Suspense>
    </div>
  )
}

