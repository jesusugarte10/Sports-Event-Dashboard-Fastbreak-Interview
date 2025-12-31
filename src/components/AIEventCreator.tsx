'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Sparkles, Loader2, X, Calendar, MapPin, Zap } from 'lucide-react'
import { createEventWithAIAction } from '@/lib/actions/ai'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type EventData = {
  name?: string
  sport?: string
  dateTime?: string
  location?: string
  description?: string
  venueNames?: string[]
  isRecurring?: boolean
  recurrencePattern?: string
}

const EXAMPLE_PROMPTS = [
  {
    text: 'Basketball game next Saturday at 2 PM',
    icon: '🏀',
  },
  {
    text: 'Soccer match this Sunday at 10 AM',
    icon: '⚽',
  },
  {
    text: 'Tennis match tomorrow at 3 PM',
    icon: '🎾',
  },
  {
    text: 'Pickleball game this weekend at noon',
    icon: '🏓',
  },
]

export function AIEventCreator() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AI sports event assistant. I can help you create events quickly and easily.\n\nJust tell me what you need, or try one of the examples below!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedEvent, setExtractedEvent] = useState<EventData | null>(null)
  const [showExamples, setShowExamples] = useState(true)
  const router = useRouter()

  // Format date safely to prevent hydration mismatches - must be at top level
  const formattedDateTime = React.useMemo(() => {
    if (!extractedEvent?.dateTime) return null
    try {
      return format(new Date(extractedEvent.dateTime), 'PPP p')
    } catch {
      return extractedEvent.dateTime
    }
  }, [extractedEvent?.dateTime])

  const handleExampleClick = (text: string) => {
    setInput(text)
    setShowExamples(false)
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSend(text)
    }, 100)
  }

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isProcessing) return

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setShowExamples(false)
    setIsProcessing(true)

    try {
      const result = await createEventWithAIAction([
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content },
      ])

      if (result.ok && result.data) {
        const { response, eventData } = result.data

        // Add assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])

        // If event data is extracted and has required fields, show confirmation
        if (eventData && Object.keys(eventData).length > 0) {
          // Only show extraction if we have at least name, sport, or dateTime
          if (eventData.name || eventData.sport || eventData.dateTime) {
            setExtractedEvent(eventData)
          }
        }
      } else {
        const error = 'error' in result ? result.error : 'Unknown error'
        let errorMessage = ''
        
        if (error.includes('API key') || error.includes('not configured')) {
          errorMessage = "I'm having trouble connecting to the AI service. Please check that the Gemini API key is configured in your environment variables."
        } else if (error.includes('model not found') || error.includes('404')) {
          errorMessage = "I'm having trouble with the AI service configuration. Please check your Gemini API settings and model access."
        } else {
          errorMessage = `I encountered an error: ${error}. Could you try rephrasing your request or providing more details about the sports event?`
        }
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or check your API configuration.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCreateEvent = async () => {
    if (!extractedEvent) return

    if (!extractedEvent.name || !extractedEvent.sport || !extractedEvent.dateTime) {
      toast.error('Missing required fields. Please provide event name, sport, and date/time.')
      return
    }

    // Ensure at least one venue is provided
    const venueNames = extractedEvent.venueNames && extractedEvent.venueNames.length > 0
      ? extractedEvent.venueNames
      : ['Main Venue'] // Default venue if none provided

    setIsProcessing(true)
    try {
      const { createEventAction } = await import('@/lib/actions/events')
      
      // Convert extracted data to form data format
      const formData = {
        name: extractedEvent.name,
        sport: extractedEvent.sport,
        dateTime: extractedEvent.dateTime,
        description: extractedEvent.description || undefined,
        location: extractedEvent.location || undefined,
        venueNames: venueNames,
      }

      const result = await createEventAction(formData)
      
      if (result.ok) {
        toast.success('✨ Event created successfully!')
        setOpen(false)
        setMessages([
          {
            role: 'assistant',
            content: "👋 Hi! I'm your AI sports event assistant. I can help you create events quickly and easily.\n\nJust tell me what you need, or try one of the examples below!",
            timestamp: new Date(),
          },
        ])
        setExtractedEvent(null)
        setShowExamples(true)
        router.push('/dashboard')
        router.refresh()
      } else {
        toast.error('error' in result ? result.error : 'Failed to create event')
      }
    } catch (error) {
      toast.error('Failed to create event')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "👋 Hi! I'm your AI sports event assistant. I can help you create events quickly and easily.\n\nJust tell me what you need, or try one of the examples below!",
        timestamp: new Date(),
      },
    ])
    setExtractedEvent(null)
    setShowExamples(true)
    setInput('')
  }

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true)
          resetChat()
        }}
        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        variant="default"
      >
        <Sparkles className="h-4 w-4" />
        Create with AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl h-[85vh] sm:h-[700px] flex flex-col p-0 bg-gradient-to-b from-background via-background/80 to-background border border-primary/15 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>AI Event Creator</span>
            </DialogTitle>
            <DialogDescription className="text-sm mt-1">
              Describe your event naturally, and I'll help you create it
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="h-full rounded-xl border border-primary/10 bg-muted/20 px-4 py-4">
              <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-3 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25'
                        : 'bg-muted/80 border border-primary/10 backdrop-blur-[1px]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                      <span className="text-xs font-semibold text-primary">You</span>
                    </div>
                  )}
                </div>
              ))}
              
              {showExamples && messages.length === 1 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">
                    Try these examples:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EXAMPLE_PROMPTS.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(example.text)}
                        disabled={isProcessing}
                        className="text-left p-3 rounded-lg border border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all group text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{example.icon}</span>
                          <span className="flex-1 text-muted-foreground group-hover:text-foreground transition-colors">
                            {example.text}
                          </span>
                          <Zap className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!showExamples && (
                <div className="flex justify-start pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowExamples(true)}
                    disabled={isProcessing}
                  >
                    Need ideas? Show examples
                  </Button>
                </div>
              )}

              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted/80 border border-primary/10 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </ScrollArea>

          {extractedEvent && (
            <div className="border-t bg-gradient-to-br from-primary/5 to-transparent px-6 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Event Preview</span>
              </div>
              <Card className="border-primary/20 bg-card/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      {extractedEvent.name && (
                        <h4 className="font-bold text-lg">{extractedEvent.name}</h4>
                      )}
                      {extractedEvent.sport && (
                        <Badge variant="default" className="font-semibold">
                          {extractedEvent.sport}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {formattedDateTime && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{formattedDateTime}</span>
                      </div>
                    )}
                    {extractedEvent.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{extractedEvent.location}</span>
                      </div>
                    )}
                    {extractedEvent.description && (
                      <p className="text-muted-foreground line-clamp-2 pt-1">
                        {extractedEvent.description}
                      </p>
                    )}
                    {extractedEvent.venueNames && extractedEvent.venueNames.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <MapPin className="h-4 w-4 text-primary" />
                        {extractedEvent.venueNames.map((venue, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {venue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateEvent}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Create Event
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setExtractedEvent(null)}
                  disabled={isProcessing}
                  size="icon"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 border-t px-6 py-4 bg-muted/30 backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden sm:flex text-xs text-muted-foreground"
              onClick={() => setShowExamples((prev) => !prev)}
              disabled={isProcessing}
            >
              {showExamples ? 'Hide examples' : 'Examples'}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your event... (e.g., 'Basketball game next Friday at 7 PM')"
              disabled={isProcessing}
              className="flex-1 border-primary/20 focus:border-primary/40"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isProcessing}
              size="icon"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
