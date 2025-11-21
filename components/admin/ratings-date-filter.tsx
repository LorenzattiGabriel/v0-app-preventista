'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, X } from 'lucide-react'

/**
 * Ratings Date Filter Component
 * Client-side component for filtering ratings by date range
 */
export function RatingsDateFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '')
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '')

  const handleFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (startDate) {
      params.set('start_date', startDate)
    } else {
      params.delete('start_date')
    }
    
    if (endDate) {
      params.set('end_date', endDate)
    } else {
      params.delete('end_date')
    }

    router.push(`/admin/dashboard?${params.toString()}`)
    router.refresh()
  }

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    router.push('/admin/dashboard')
    router.refresh()
  }

  const hasActiveFilters = startDate || endDate

  // Set default dates for quick filters
  const setLastMonth = () => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const setLastWeek = () => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  const setThisMonth = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date()
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Filtrar por Fecha</CardTitle>
            <CardDescription>Selecciona un rango de fechas para las métricas</CardDescription>
          </div>
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setLastWeek}
          >
            Última semana
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setThisMonth}
          >
            Este mes
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={setLastMonth}
          >
            Último mes
          </Button>
        </div>

        {/* Custom date range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Fecha Inicio</Label>
            <Input
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Fecha Fin</Label>
            <Input
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button onClick={handleFilter} className="flex-1">
            Aplicar Filtro
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Current filter display */}
        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Mostrando datos desde{' '}
            {startDate ? new Date(startDate).toLocaleDateString('es-AR') : 'el inicio'} hasta{' '}
            {endDate ? new Date(endDate).toLocaleDateString('es-AR') : 'ahora'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

