import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EventForm } from '@/components/EventForm'
import { getEventAction, updateEventAction } from '@/lib/actions/events'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

type EditEventPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { id } = await params
  const result = await getEventAction(id)

  if (!result.ok) {
    notFound()
  }

  const event = result.data

  async function handleSubmit(data: Parameters<typeof updateEventAction>[1]) {
    'use server'
    return await updateEventAction(id, data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
          <p className="text-muted-foreground mt-1">
            Update event information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Update the information for your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventForm
            defaultValues={{
              name: event.name,
              sport: event.sport,
              dateTime: event.dateTime,
              description: event.description,
              location: event.location,
              venueNames: event.venueNames,
            }}
            onSubmit={handleSubmit}
            submitLabel="Update Event"
          />
        </CardContent>
      </Card>
    </div>
  )
}

