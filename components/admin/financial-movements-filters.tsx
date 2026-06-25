"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, RotateCcw } from "lucide-react"
import Link from "next/link"
import { PartyCombobox, type PartyOption } from "@/components/admin/party-combobox"
import { RouteCombobox, type RouteOption } from "@/components/admin/route-combobox"

interface FinancialMovementsFiltersProps {
  parties: PartyOption[]
  routes: RouteOption[]
  defaults: {
    search?: string
    partyId?: string
    routeId?: string
    source?: string
    direction?: string
    channel?: string
    paymentMethod?: string
    dateFrom?: string
    dateTo?: string
  }
}

const PAYMENT_METHODS = [
  "Efectivo",
  "Transferencia",
  "Tarjeta",
  "Cheque",
  "Cuenta Corriente",
  "Otro",
]

export function FinancialMovementsFilters({ parties, routes, defaults }: FinancialMovementsFiltersProps) {
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom || "")
  const [dateTo, setDateTo] = useState(defaults.dateTo || "")

  return (
    <form className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
      <div className="space-y-1.5 lg:col-span-2">
        <Label className="text-xs text-muted-foreground">Cliente / Proveedor</Label>
        <PartyCombobox parties={parties} defaultPartyId={defaults.partyId} />
      </div>

      <div className="space-y-1.5 lg:col-span-2">
        <Label className="text-xs text-muted-foreground">Reparto / Ruta</Label>
        <RouteCombobox routes={routes} defaultRouteId={defaults.routeId} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Desde</Label>
        <Input
          type="date"
          name="dateFrom"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Hasta</Label>
        <Input
          type="date"
          name="dateTo"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Origen</Label>
        <Select name="source" defaultValue={defaults.source || "all"}>
          <SelectTrigger>
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            <SelectItem value="cuenta_cliente">Cuenta cliente</SelectItem>
            <SelectItem value="egreso_proveedor">Egreso a proveedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Dirección</Label>
        <Select name="direction" defaultValue={defaults.direction || "all"}>
          <SelectTrigger>
            <SelectValue placeholder="Dirección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ingresos y egresos</SelectItem>
            <SelectItem value="ingreso">🟢 Ingresos (cobros)</SelectItem>
            <SelectItem value="egreso">🔴 Egresos / cargos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Canal</Label>
        <Select name="channel" defaultValue={defaults.channel || "all"}>
          <SelectTrigger>
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los canales</SelectItem>
            <SelectItem value="ruta">🚚 Cobro en ruta</SelectItem>
            <SelectItem value="fuera_ruta">🏢 Fuera de ruta</SelectItem>
            <SelectItem value="proveedor">📦 Proveedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Método de pago</Label>
        <Select name="paymentMethod" defaultValue={defaults.paymentMethod || "all"}>
          <SelectTrigger>
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los métodos</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 lg:col-span-2">
        <Label className="text-xs text-muted-foreground">Texto libre (descripción, N° pedido, notas)</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Buscar en descripción, pedido o notas..."
            className="pl-10"
            defaultValue={defaults.search}
          />
        </div>
      </div>

      <div className="flex items-end gap-2 md:col-span-3 lg:col-span-2">
        <Button type="submit">
          <Search className="h-4 w-4 mr-2" />
          Aplicar filtros
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/cuentas-corrientes/movimientos">
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar
          </Link>
        </Button>
      </div>
    </form>
  )
}
