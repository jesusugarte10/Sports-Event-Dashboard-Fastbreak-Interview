import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EventForm } from '@/components/EventForm'
import { createEventAction } from '@/lib/actions/events'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewEventPage() {
  async function handleSubmit(data: Parameters<typeof createEventAction>[0]) {
    'use server'
    return await createEventAction(data)
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
          <h1 className="text-3xl font-bold tracking-tight">Create New Event</h1>
          <p className="text-muted-foreground mt-1">
            Add a new sports event to your dashboard
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>Fill in the information for your event</CardDescription>
        </CardHeader>
        <CardContent>
          <EventForm onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  )
}

