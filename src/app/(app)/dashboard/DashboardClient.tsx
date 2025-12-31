'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useEffect, useRef } from 'react'

type DashboardClientProps = {
  initialSearch?: string
  initialSport?: string
  initialDateFilter?: string
  sports: string[]
}

const DATE_FILTERS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past Events' },
]

export function DashboardClient({ 
  initialSearch, 
  initialSport, 
  initialDateFilter,
  sports 
}: DashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(initialSearch || '')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search - only update URL after user stops typing
  useEffect(() => {
    // Clear any existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set a new timeout to update the URL
    debounceRef.current = setTimeout(() => {
      // Use window.location.search to get fresh params at execution time
      const params = new URLSearchParams(window.location.search)
      const currentSearch = params.get('search') || ''
      
      // Only update if the search value has actually changed from the URL
      if (searchValue !== currentSearch) {
        if (searchValue) {
          params.set('search', searchValue)
        } else {
          params.delete('search')
        }
        startTransition(() => {
          // Use replace with scroll:false to avoid disrupting focus/keyboard on mobile
          router.replace(`/dashboard?${params.toString()}`, { scroll: false })
        })
      }
    }, 300) // 300ms debounce delay

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchValue, router])

  const handleFilterChange = (key: string, value: string, defaultValue: string) => {
    // Cancel any pending debounced search since we're navigating now
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    
    // Use fresh URL params and merge with the current searchValue state
    // This ensures unsaved search text isn't lost when changing filters
    const params = new URLSearchParams(window.location.search)
    
    // Include the current searchValue (which may not be in the URL yet due to debounce)
    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }
    
    // Apply the filter change
    if (value && value !== defaultValue) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    startTransition(() => {
      router.replace(`/dashboard?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex gap-3 flex-col sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
          disabled={isPending}
        />
      </div>

      {/* Sport Filter */}
      <Select 
        defaultValue={initialSport || 'all'} 
        onValueChange={(v) => handleFilterChange('sport', v, 'all')} 
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Sport" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sports</SelectItem>
          {sports.map((sport) => (
            <SelectItem key={sport} value={sport}>
              {sport}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Filter */}
      <Select 
        defaultValue={initialDateFilter || 'all'} 
        onValueChange={(v) => handleFilterChange('date', v, 'all')} 
        disabled={isPending}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          {DATE_FILTERS.map((filter) => (
            <SelectItem key={filter.value} value={filter.value}>
              {filter.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
