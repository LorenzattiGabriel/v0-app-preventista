"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"

interface ReportDateFilterProps {
  startDate: Date
  endDate: Date
}

export function ReportDateFilter({ startDate, endDate }: ReportDateFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [date, setDate] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  })

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate)
    if (newDate?.from && newDate?.to) {
      const params = new URLSearchParams()
      params.set("from", format(newDate.from, "yyyy-MM-dd"))
      params.set("to", format(newDate.to, "yyyy-MM-dd"))
      router.push(`${pathname}?${params.toString()}`)
    }
  }

  const handlePreset = (preset: "today" | "week" | "month" | "lastMonth") => {
    const today = new Date()
    let from: Date
    let to: Date

    switch (preset) {
      case "today":
        from = today
        to = today
        break
      case "week":
        from = startOfWeek(today, { weekStartsOn: 1 })
        to = endOfWeek(today, { weekStartsOn: 1 })
        break
      case "month":
        from = startOfMonth(today)
        to = endOfMonth(today)
        break
      case "lastMonth":
        const lastMonth = subMonths(today, 1)
        from = startOfMonth(lastMonth)
        to = endOfMonth(lastMonth)
        break
    }

    handleDateChange({ from, to })
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="flex gap-1">
        <Button variant="outline" size="sm" onClick={() => handlePreset("today")}>
          Hoy
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePreset("week")}>
          Esta Semana
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePreset("month")}>
          Este Mes
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePreset("lastMonth")}>
          Mes Anterior
        </Button>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("justify-start text-left font-normal")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: es })} - {format(date.to, "dd/MM/yyyy", { locale: es })}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar mode="range" selected={date} onSelect={handleDateChange} locale={es} numberOfMonths={2} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

