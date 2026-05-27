"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { getLocalDateString, getLocalTomorrowDateString, formatDateLocal } from "@/lib/utils/dates"

interface RepartidorRoutesFilterProps {
  selectedDate: string
}

export function RepartidorRoutesFilter({ selectedDate }: RepartidorRoutesFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleDateChange = (newDate: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (newDate) {
      params.set("selected_date", newDate)
    } else {
      params.delete("selected_date")
    }

    router.push(`/repartidor/dashboard?${params.toString()}`)
  }

  const handleToday = () => {
    handleDateChange(getLocalDateString())
  }

  const handleTomorrow = () => {
    handleDateChange(getLocalTomorrowDateString())
  }

  const handleNextWeek = () => {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    handleDateChange(formatDateLocal(nextWeek))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Filtrar por Fecha
        </CardTitle>
        <CardDescription>Selecciona una fecha para ver tus rutas planificadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="selected_date">Fecha</Label>
          <Input
            id="selected_date"
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            min={getLocalDateString()}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={handleTomorrow}>
            Mañana
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            Próxima Semana
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

