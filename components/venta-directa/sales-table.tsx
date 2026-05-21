"use client"

// Tabla de ventas con filtros y paginación cliente-side.
// Recibe el dataset completo (limit razonable arriba) y filtra/pagina en el navegador.

import { useMemo, useState } from "react"
import Link from "next/link"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import { PAYMENT_METHODS } from "@/lib/types/database"
import type { DirectSale } from "@/lib/types/venta-directa"
import { DownloadSaleReceiptButton } from "./download-sale-receipt-button"

interface SalesTableProps {
  sales: DirectSale[]
  pageSize?: number
}

const PAGE_SIZE_DEFAULT = 20

export function SalesTable({ sales, pageSize = PAGE_SIZE_DEFAULT }: SalesTableProps) {
  const [search, setSearch] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null
    const to = toDate ? new Date(toDate + "T23:59:59").getTime() : null

    return sales.filter((sale) => {
      // Filtro por texto (número de pedido, nombre cliente)
      if (s) {
        const matchOrder = sale.order_number?.toLowerCase().includes(s)
        const matchCustomer = sale.customer?.commercial_name?.toLowerCase().includes(s)
        if (!matchOrder && !matchCustomer) return false
      }

      // Filtro por método de pago
      if (paymentFilter !== "all" && sale.payment_method !== paymentFilter) {
        return false
      }

      // Filtro por rango de fechas
      const saleTs = new Date(sale.created_at).getTime()
      if (from && saleTs < from) return false
      if (to && saleTs > to) return false

      return true
    })
  }, [sales, search, paymentFilter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const pageRows = filtered.slice(start, start + pageSize)

  const totalRevenue = filtered.reduce((s, x) => s + (x.total || 0), 0)

  const clearFilters = () => {
    setSearch("")
    setPaymentFilter("all")
    setFromDate("")
    setToDate("")
    setPage(1)
  }

  const hasActiveFilters =
    search !== "" || paymentFilter !== "all" || fromDate !== "" || toDate !== ""

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] items-end">
        <div>
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="N° pedido o cliente"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label>Método de pago</Label>
          <Select
            value={paymentFilter}
            onValueChange={(v) => {
              setPaymentFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="from">Desde</Label>
          <Input
            id="from"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div>
          <Label htmlFor="to">Hasta</Label>
          <Input
            id="to"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      </div>

      {/* Resumen rápido del filtro */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>
          {filtered.length === sales.length
            ? `${sales.length} ventas`
            : `${filtered.length} de ${sales.length} ventas`}
          {hasActiveFilters && " (filtradas)"}
        </div>
        <div>
          Total filtrado:{" "}
          <span className="font-semibold text-foreground">
            ${totalRevenue.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {sales.length === 0
                    ? "Todavía no tenés ventas registradas."
                    : "No hay resultados con los filtros aplicados."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.order_number}</TableCell>
                  <TableCell>{s.customer?.commercial_name || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(s.created_at).toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${s.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs">{s.payment_method || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/venta-directa/ventas/${s.id}`}>Ver</Link>
                      </Button>
                      <DownloadSaleReceiptButton sale={s} variant="ghost" size="icon">
                        {null}
                      </DownloadSaleReceiptButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            Página {safePage} de {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
