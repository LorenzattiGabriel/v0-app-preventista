'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { ORDER_STATUS, ORDER_PRIORITY, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/constants/order-status'

/**
 * Orders Filters Component
 * Client-side component for filtering orders
 */
export function OrdersFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [priority, setPriority] = useState(searchParams.get('priority') || 'all')

  const handleFilter = () => {
    const params = new URLSearchParams()
    
    if (search.trim()) params.set('search', search.trim())
    if (status && status !== 'all') params.set('status', status)
    if (priority && priority !== 'all') params.set('priority', priority)
    
    // Reset to page 1 when filtering
    params.set('page', '1')

    startTransition(() => {
      router.push(`/admin/orders?${params.toString()}`)
    })
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
    setPriority('all')
    
    startTransition(() => {
      router.push('/admin/orders')
    })
  }

  const hasActiveFilters = search || (status && status !== 'all') || (priority && priority !== 'all')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de pedido o cliente..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFilter()
              }
            }}
          />
        </div>
        
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleFilter} disabled={isPending}>
          <Search className="h-4 w-4 mr-2" />
          Filtrar
        </Button>

        {hasActiveFilters && (
          <Button 
            variant="outline" 
            onClick={handleClearFilters} 
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">Filtrando...</p>
      )}
    </div>
  )
}


