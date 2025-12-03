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

/**
 * Client Orders Filters Component
 * Client-side component for filtering customer orders
 */
export function ClientOrdersFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')

  // Only show statuses relevant to customers
  const customerStatuses = {
    all: 'Todos los estados',
    PENDIENTE_ARMADO: 'En Preparación',
    EN_ARMADO: 'Armándose',
    PENDIENTE_ENTREGA: 'Listo para Entrega',
    EN_REPARTICION: 'En Camino',
    ENTREGADO: 'Entregado',
  }

  const handleFilter = () => {
    const params = new URLSearchParams()
    
    if (search.trim()) params.set('search', search.trim())
    if (status && status !== 'all') params.set('status', status)

    startTransition(() => {
      router.push(`/cliente/orders?${params.toString()}`)
    })
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
    
    startTransition(() => {
      router.push('/cliente/orders')
    })
  }

  const hasActiveFilters = search || (status && status !== 'all')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de pedido..."
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
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(customerStatuses).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleFilter} disabled={isPending}>
          <Search className="h-4 w-4 mr-2" />
          Buscar
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

