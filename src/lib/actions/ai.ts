'use server'

import { safeAction } from './safe-action'

type GeminiResponse = {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ExtractedEventData = {
  name?: string
  sport?: string
  dateTime?: string
  location?: string
  description?: string
  venueNames?: string[]
  isRecurring?: boolean
  recurrencePattern?: string
}

export async function createEventWithAIAction(messages: ChatMessage[]) {
  return safeAction(async () => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Get current date info for the AI - use UTC consistently to avoid timezone mismatches
    const now = new Date()
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth()
    const currentDay = now.getUTCDate()
    
    // Format current date as YYYY-MM-DD in UTC
    const currentDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`
    
    // Get day of week in UTC
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeek = dayNames[now.getUTCDay()]
    
    // Calculate tomorrow in UTC
    const tomorrowDate = new Date(Date.UTC(currentYear, currentMonth, currentDay + 1))
    const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0]
    
    // Calculate "this weekend" dates in UTC
    // If today is already Saturday or Sunday, we're in the current weekend
    const utcDayOfWeek = now.getUTCDay()
    let thisWeekendSaturdayStr: string
    let thisWeekendSundayStr: string
    
    if (utcDayOfWeek === 6) {
      // Today is Saturday - "this Saturday" = today, "this Sunday" = tomorrow
      thisWeekendSaturdayStr = currentDate
      const sundayDate = new Date(Date.UTC(currentYear, currentMonth, currentDay + 1))
      thisWeekendSundayStr = sundayDate.toISOString().split('T')[0]
    } else if (utcDayOfWeek === 0) {
      // Today is Sunday - "this Saturday" = yesterday, "this Sunday" = today
      const saturdayDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - 1))
      thisWeekendSaturdayStr = saturdayDate.toISOString().split('T')[0]
      thisWeekendSundayStr = currentDate
    } else {
      // Weekday (Mon-Fri) - calculate the upcoming weekend
      const daysUntilSaturday = 6 - utcDayOfWeek
      const saturdayDate = new Date(Date.UTC(currentYear, currentMonth, currentDay + daysUntilSaturday))
      thisWeekendSaturdayStr = saturdayDate.toISOString().split('T')[0]
      const sundayDate = new Date(Date.UTC(currentYear, currentMonth, currentDay + daysUntilSaturday + 1))
      thisWeekendSundayStr = sundayDate.toISOString().split('T')[0]
    }

    // Build conversation with system context
    const systemContext = `You are an AI assistant EXCLUSIVELY for creating SPORTS EVENTS. Your ONLY purpose is to help users create sports events. If users ask about anything NOT related to sports events, politely redirect them. Available sports: Basketball, Football, Soccer, Baseball, Tennis, Volleyball, Hockey, Pickleball, Other.`

    const conversationHistory = [
      systemContext,
      ...messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    ].join('\n')

    const prompt = `You are an AI assistant EXCLUSIVELY for creating SPORTS EVENTS. Your ONLY purpose is to help users create sports events through conversation.

CRITICAL DATE INFORMATION - USE THESE EXACT VALUES:
- TODAY'S DATE: ${currentDate} (${dayOfWeek})
- CURRENT YEAR: ${currentYear}
- TOMORROW: ${tomorrowDateStr}
- THIS WEEKEND (Saturday): ${thisWeekendSaturdayStr}
- THIS WEEKEND (Sunday): ${thisWeekendSundayStr}

IMPORTANT RULES:
- ONLY respond to requests about creating SPORTS EVENTS
- If the user asks about anything NOT related to sports events, politely decline and redirect them back to sports events
- Available sports: Basketball, Football, Soccer, Baseball, Tennis, Volleyball, Hockey, Pickleball, Other
- You CANNOT help with: general questions, other topics, non-sports events, or anything unrelated to sports event creation

Based on the conversation below, extract event details and respond in TWO parts:

1. A natural, friendly response to the user (like you're continuing the conversation)
   - If the request is NOT about sports events, politely say: "I can only help you create sports events. Could you tell me about a sports event you'd like to create?"
   - If information is missing, ask the user naturally
2. A JSON object with extracted event data (only if it's a sports event request)

DATE/TIME CONVERSION RULES - FOLLOW EXACTLY:
- "today" → ${currentDate}
- "tomorrow" → ${tomorrowDateStr}
- "this weekend" or "this Saturday" → ${thisWeekendSaturdayStr}
- "this Sunday" → ${thisWeekendSundayStr}
- "next week" = add 7 days to today: calculate from ${currentDate}
- "next Monday/Tuesday/etc" = find the next occurrence of that day from ${currentDate}
- Time conversion: "2 PM" or "2pm" or "2:00 PM" → 14:00:00
- Time conversion: "9 AM" or "9am" → 09:00:00
- If no time specified, use 12:00:00 (noon) as default
- ALWAYS output dates in ${currentYear} or later - NEVER use past years
- Final format must be: YYYY-MM-DDTHH:mm:ss (e.g., ${currentDate}T14:00:00)

For recurring events, detect patterns like:
- "every Monday", "weekly", "every week" → recurrencePattern: "weekly"
- "every day", "daily" → recurrencePattern: "daily"
- "every month", "monthly" → recurrencePattern: "monthly"
- "every year", "annually" → recurrencePattern: "yearly"

Response format (exactly):
RESPONSE_START
[Your natural response to the user - ONLY about sports events]
RESPONSE_END

JSON_START
{
  "name": "event name or null",
  "sport": "sport type or null",
  "dateTime": "ISO datetime string or null - MUST be ${currentYear} or later",
  "location": "location string or null",
  "description": "description or null",
  "venueNames": ["venue1", "venue2"] or [],
  "isRecurring": true/false,
  "recurrencePattern": "weekly/daily/monthly/yearly or null"
}
JSON_END

Conversation:
${conversationHistory}

Extract the event details now (ONLY if it's a sports event request). Remember: Today is ${currentDate} (${dayOfWeek}), year ${currentYear}.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Gemini API error: ${errorText}`
      
      // Provide helpful error message for model not found
      if (errorText.includes('not found') || errorText.includes('404')) {
        errorMessage = `Gemini API model not found. Please check your API key and ensure you have access to the Gemini API. Error: ${errorText}`
      }
      
      throw new Error(errorMessage)
    }

    const data: GeminiResponse = await response.json()
    const fullResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    if (!fullResponse) {
      throw new Error('No response generated')
    }

    // Extract response and JSON
    const responseMatch = fullResponse.match(/RESPONSE_START([\s\S]*?)RESPONSE_END/)
    const jsonMatch = fullResponse.match(/JSON_START([\s\S]*?)JSON_END/)

    const assistantResponse = responseMatch
      ? responseMatch[1].trim()
      : "I'm processing your request. Could you provide more details about the event?"

    let eventData: ExtractedEventData = {}

    if (jsonMatch) {
      try {
        const jsonStr = jsonMatch[1].trim()
        eventData = JSON.parse(jsonStr)
      } catch (error) {
        // If JSON parsing fails, try to extract from the response
        console.error('Failed to parse JSON:', error)
      }
    }

    return {
      response: assistantResponse,
      eventData,
    }
  })
}
