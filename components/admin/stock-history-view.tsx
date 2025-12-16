"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Loader2,
  History,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import type { StockMovementType, StockMovementWithUser } from "@/lib/types/database"

interface StockHistoryViewProps {
  users: Array<{ id: string; full_name: string }>
  products: Array<{ id: string; code: string; name: string }>
}

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  manual_edit: "Edición Manual",
  csv_import: "Importación CSV",
  order_assembly: "Armado de Pedido",
  inventory_adjustment: "Ajuste de Inventario",
  purchase_receipt: "Recepción de Compra",
  return: "Devolución",
  damage: "Baja por Daño",
  expiration: "Baja por Vencimiento",
}

const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  manual_edit: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  csv_import: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  order_assembly: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  inventory_adjustment: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  purchase_receipt: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  return: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  damage: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expiration: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function StockHistoryView({ users, products }: StockHistoryViewProps) {
  const router = useRouter()
  const supabase = createClient()

  // State
  const [movements, setMovements] = useState<StockMovementWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20

  // Filters
  const [productFilter, setProductFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Fetch movements
  const fetchMovements = async () => {
    setIsLoading(true)

    try {
      let query = supabase
        .from("stock_movements_with_user")
        .select("*", { count: "exact" })

      // Apply filters
      if (productFilter && productFilter !== "all") {
        query = query.eq("product_id", productFilter)
      }
      if (typeFilter && typeFilter !== "all") {
        query = query.eq("movement_type", typeFilter)
      }
      if (userFilter && userFilter !== "all") {
        query = query.eq("created_by", userFilter)
      }
      if (fromDate) {
        query = query.gte("created_at", fromDate)
      }
      if (toDate) {
        query = query.lte("created_at", `${toDate}T23:59:59`)
      }
      if (searchTerm) {
        query = query.or(`product_code.ilike.%${searchTerm}%,product_name.ilike.%${searchTerm}%`)
      }

      // Pagination
      const from = (currentPage - 1) * perPage
      const to = from + perPage - 1

      query = query.order("created_at", { ascending: false }).range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setMovements(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error("Error fetching stock history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [currentPage, productFilter, typeFilter, userFilter, fromDate, toDate])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchMovements()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleClearFilters = () => {
    setProductFilter("all")
    setTypeFilter("all")
    setUserFilter("all")
    setFromDate("")
    setToDate("")
    setSearchTerm("")
    setCurrentPage(1)
  }

  const handleExportCSV = async () => {
    try {
      // Fetch all data for export (max 10k)
      let query = supabase
        .from("stock_movements_with_user")
        .select("*")

      if (productFilter && productFilter !== "all") {
        query = query.eq("product_id", productFilter)
      }
      if (typeFilter && typeFilter !== "all") {
        query = query.eq("movement_type", typeFilter)
      }
      if (userFilter && userFilter !== "all") {
        query = query.eq("created_by", userFilter)
      }
      if (fromDate) {
        query = query.gte("created_at", fromDate)
      }
      if (toDate) {
        query = query.lte("created_at", `${toDate}T23:59:59`)
      }

      query = query.order("created_at", { ascending: false }).limit(10000)

      const { data, error } = await query

      if (error) throw error

      // Generate CSV
      const headers = ["Fecha", "Código", "Producto", "Anterior", "Nuevo", "Cambio", "Tipo", "Usuario", "Notas"]
      const rows = (data || []).map(m => [
        new Date(m.created_at).toLocaleString("es-AR"),
        m.product_code,
        m.product_name,
        m.previous_stock,
        m.new_stock,
        m.quantity_changed > 0 ? `+${m.quantity_changed}` : m.quantity_changed,
        MOVEMENT_TYPE_LABELS[m.movement_type as StockMovementType] || m.movement_type,
        m.user_name || "Sistema",
        m.notes || "",
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
      ].join("\n")

      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `historial_stock_${new Date().toISOString().split("T")[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("Error al exportar el historial")
    }
  }

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <History className="h-8 w-8" />
              Historial de Stock
            </h1>
            <p className="text-muted-foreground">Auditoría de todos los movimientos de inventario</p>
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Buscar producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Product filter */}
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los productos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type filter */}
            <div className="space-y-2">
              <Label>Tipo de movimiento</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User filter */}
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Clear filters */}
            <div className="space-y-2 flex items-end">
              <Button variant="ghost" onClick={handleClearFilters} className="w-full">
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Movimientos
            <Badge variant="secondary" className="ml-2">
              {totalCount} registros
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron movimientos con los filtros aplicados
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Anterior</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                      <TableHead className="text-right">Cambio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(m.created_at).toLocaleDateString("es-AR")}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString("es-AR", { 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.product_code}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {m.product_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.previous_stock}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {m.new_stock}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center gap-1 font-medium ${
                            m.quantity_changed > 0 
                              ? "text-green-600 dark:text-green-400" 
                              : m.quantity_changed < 0 
                                ? "text-red-600 dark:text-red-400" 
                                : "text-muted-foreground"
                          }`}>
                            {m.quantity_changed > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : m.quantity_changed < 0 ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                            {m.quantity_changed > 0 ? "+" : ""}{m.quantity_changed}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={MOVEMENT_TYPE_COLORS[m.movement_type as StockMovementType]}
                          >
                            {MOVEMENT_TYPE_LABELS[m.movement_type as StockMovementType] || m.movement_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.user_name || "Sistema"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {m.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalCount)} de {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

