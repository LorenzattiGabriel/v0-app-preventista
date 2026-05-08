"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Download, Search, X, Loader2, FileSpreadsheet } from "lucide-react"
import { generatePriceListPDF, generatePriceListCSV, downloadCSV } from "@/lib/price-list-generator"
import { toast } from "sonner"

interface Product {
  id: string
  code?: string
  name: string
  brand?: string
  category?: string
  unit_of_measure?: string
  base_price: number
  wholesale_price?: number | null
  retail_price?: number | null
  is_active: boolean
  current_stock?: number
}

export function PriceListButton() {
  const [open, setOpen] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [brand, setBrand] = useState("all")
  const [category, setCategory] = useState("all")
  const [onlyActive, setOnlyActive] = useState(true)

  // Load all active products when dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/admin/products/price-list?is_active=all")
      .then((r) => r.json())
      .then((data) => {
        setAllProducts(data.products || [])
        setBrands(data.brands || [])
        setCategories(data.categories || [])
      })
      .catch(() => toast.error("Error al cargar productos"))
      .finally(() => setLoading(false))
  }, [open])

  // Client-side filtering (instant, no re-fetch)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allProducts.filter((p) => {
      if (onlyActive && !p.is_active) return false
      if (brand !== "all" && p.brand !== brand) return false
      if (category !== "all" && p.category !== category) return false
      if (q) {
        const match =
          p.name?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [allProducts, search, brand, category, onlyActive])

  const filterLabel = () => {
    const parts: string[] = []
    if (brand !== "all") parts.push(`Marca: ${brand}`)
    if (category !== "all") parts.push(`Categoría: ${category}`)
    if (search) parts.push(`Búsqueda: "${search}"`)
    if (onlyActive) parts.push("Solo activos")
    return parts.length ? parts.join(" · ") : undefined
  }

  const handleDownloadPDF = async () => {
    if (filtered.length === 0) {
      toast.error("No hay productos para descargar")
      return
    }
    setDownloading(true)
    try {
      const doc = await generatePriceListPDF(filtered, filterLabel())
      const date = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
      doc.save(`Lista_Precios_${date}.pdf`)
      toast.success(`PDF generado con ${filtered.length} productos`)
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadCSV = () => {
    if (filtered.length === 0) {
      toast.error("No hay productos para descargar")
      return
    }
    const csv = generatePriceListCSV(filtered)
    const date = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
    downloadCSV(csv, `Lista_Precios_${date}.csv`)
    toast.success(`CSV generado con ${filtered.length} productos`)
  }

  const clearFilters = () => {
    setSearch("")
    setBrand("all")
    setCategory("all")
    setOnlyActive(true)
  }

  const hasFilters = search || brand !== "all" || category !== "all" || !onlyActive

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileText className="mr-2 h-4 w-4" />
        Lista de Precios
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Lista de Precios</DialogTitle>
            <DialogDescription>
              Filtrá los productos y descargá la lista en PDF o CSV para enviar a clientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-3">
              {/* Search */}
              <div className="col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, marca o código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Marca</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Only active toggle */}
            <div className="flex items-center gap-2">
              <Switch id="onlyActive" checked={onlyActive} onCheckedChange={setOnlyActive} />
              <Label htmlFor="onlyActive" className="text-sm">
                Solo productos activos
              </Label>
            </div>

            {/* Result count + clear */}
            <div className="flex items-center justify-between py-2 border-t border-b">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando productos...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant={filtered.length > 0 ? "default" : "secondary"}>
                    {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                  </Badge>
                  {hasFilters && (
                    <span className="text-xs text-muted-foreground">
                      de {allProducts.filter((p) => !onlyActive || p.is_active).length} totales
                    </span>
                  )}
                </div>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  <X className="mr-1 h-3 w-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Preview table (first 8 rows) */}
            {!loading && filtered.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Producto</th>
                      <th className="text-left p-2 font-medium">Marca</th>
                      <th className="text-left p-2 font-medium hidden sm:table-cell">Categoría</th>
                      <th className="text-right p-2 font-medium">P. Base</th>
                      <th className="text-right p-2 font-medium">P. Mayor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 8).map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-2">
                          <p className="font-medium truncate max-w-[160px]">{p.name}</p>
                          {p.code && <p className="text-muted-foreground">{p.code}</p>}
                        </td>
                        <td className="p-2 text-muted-foreground truncate max-w-[80px]">
                          {p.brand || "-"}
                        </td>
                        <td className="p-2 text-muted-foreground hidden sm:table-cell truncate max-w-[80px]">
                          {p.category || "-"}
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${Number(p.base_price).toFixed(2)}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {p.wholesale_price != null ? `$${Number(p.wholesale_price).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center py-2 border-t bg-muted/30">
                    ... y {filtered.length - 8} producto{filtered.length - 8 !== 1 ? "s" : ""} más
                  </p>
                )}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                No hay productos que coincidan con los filtros.
              </p>
            )}

            {/* Download buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={handleDownloadPDF}
                disabled={downloading || loading || filtered.length === 0}
              >
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Descargar PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadCSV}
                disabled={loading || filtered.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Descargar Excel/CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
