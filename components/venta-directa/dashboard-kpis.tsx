"use client"

// Bloque de KPIs con selector de período (Hoy / Semana / Mes / Mes anterior / Personalizado).
// Calcula en cliente a partir del dataset ya cargado por la página server.

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarRange } from "lucide-react"
import type { DirectSale } from "@/lib/types/venta-directa"
import {
  aggregateSalesToKpis,
  filterSalesByRange,
  getRangeForPreset,
} from "@/lib/utils/sales-aggregation"
import { SaleKpiCards } from "./sale-kpi-cards"

type Preset = "today" | "week" | "current_month" | "previous_month" | "custom"

const PRESET_LABELS: Record<Preset, string> = {
  today: "Hoy",
  week: "Esta semana",
  current_month: "Mes en curso",
  previous_month: "Mes anterior",
  custom: "Personalizado",
}

interface Props {
  sales: DirectSale[]
}

function fmtRange(from: Date, to: Date): string {
  const fromStr = from.toLocaleDateString("es-AR")
  const toStr = to.toLocaleDateString("es-AR")
  return fromStr === toStr ? fromStr : `${fromStr} - ${toStr}`
}

export function DashboardKpis({ sales }: Props) {
  const [preset, setPreset] = useState<Preset>("current_month")
  const [customFrom, setCustomFrom] = useState<string>("")
  const [customTo, setCustomTo] = useState<string>("")

  const range = useMemo(() => {
    if (preset === "custom") {
      if (!customFrom || !customTo) return null
      const from = new Date(customFrom + "T00:00:00")
      const to = new Date(customTo + "T23:59:59")
      return { from, to }
    }
    return getRangeForPreset(preset)
  }, [preset, customFrom, customTo])

  const kpis = useMemo(() => {
    if (!range) return aggregateSalesToKpis([])
    const filtered = filterSalesByRange(sales, range)
    return aggregateSalesToKpis(filtered)
  }, [sales, range])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Resumen
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {range
              ? fmtRange(range.from, range.to)
              : "Elegí un rango de fechas"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de período */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
            <Button
              key={p}
              type="button"
              variant={preset === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset(p)}
            >
              {PRESET_LABELS[p]}
            </Button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="grid gap-3 sm:grid-cols-2 max-w-md">
            <div>
              <Label htmlFor="kpi-from">Desde</Label>
              <Input
                id="kpi-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="kpi-to">Hasta</Label>
              <Input
                id="kpi-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <SaleKpiCards kpis={kpis} />
      </CardContent>
    </Card>
  )
}
