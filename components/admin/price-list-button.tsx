"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Download, Search, X, Loader2, FileSpreadsheet, ChevronDown, LayoutList, Tag, DollarSign } from "lucide-react"
import { generatePriceListPDF, generatePriceListCSV, downloadCSV, type GroupBy, type PriceMode } from "@/lib/price-list-generator"
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
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [category, setCategory] = useState("all")
  const [onlyActive, setOnlyActive] = useState(true)
  const [groupBy, setGroupBy] = useState<GroupBy>("category")
  const [priceMode, setPriceMode] = useState<PriceMode>("both")
  const [discountPercent, setDiscountPercent] = useState<string>("10")

  // Load all products when dialog opens
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

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const clearBrands = () => setSelectedBrands([])
  const selectAllBrands = () => setSelectedBrands([...brands])

  // Client-side filtering
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allProducts.filter((p) => {
      if (onlyActive && !p.is_active) return false
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand || "")) return false
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
  }, [allProducts, search, selectedBrands, category, onlyActive])

  const filterLabel = () => {
    const parts: string[] = []
    if (selectedBrands.length === 1) parts.push(`Marca: ${selectedBrands[0]}`)
    else if (selectedBrands.length > 1) parts.push(`${selectedBrands.length} marcas`)
    if (category !== "all") parts.push(`Categoría: ${category}`)
    if (search) parts.push(`Búsqueda: "${search}"`)
    if (onlyActive) parts.push("Solo activos")
    return parts.length ? parts.join(" · ") : undefined
  }

  const parsedDiscount = (() => {
    const n = parseFloat(discountPercent.replace(",", "."))
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0
  })()

  const priceModeSuffix = () => {
    switch (priceMode) {
      case "base": return "Base"
      case "wholesale": return "Mayorista"
      case "retail": return "Minorista"
      case "discount": return `Base-${parsedDiscount}pct`
      case "both":
      default: return "Completa"
    }
  }

  const handleDownloadPDF = async () => {
    if (filtered.length === 0) {
      toast.error("No hay productos para descargar")
      return
    }
    if (priceMode === "discount" && parsedDiscount <= 0) {
      toast.error("Ingresá un descuento mayor a 0")
      return
    }
    setDownloading(true)
    try {
      const doc = await generatePriceListPDF(filtered, filterLabel(), groupBy, {
        mode: priceMode,
        discountPercent: priceMode === "discount" ? parsedDiscount : undefined,
      })
      const date = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")
      doc.save(`Lista_Precios_${priceModeSuffix()}_${date}.pdf`)
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
    setSelectedBrands([])
    setCategory("all")
    setOnlyActive(true)
  }

  const hasFilters = search || selectedBrands.length > 0 || category !== "all" || !onlyActive

  const brandButtonLabel =
    selectedBrands.length === 0
      ? "Todas las marcas"
      : selectedBrands.length === 1
      ? selectedBrands[0]
      : `${selectedBrands.length} marcas seleccionadas`

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
              Filtrá los productos, elegí el precio a mostrar y descargá la lista en PDF o CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            {/* Search */}
            <div className="relative">
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

            <div className="grid grid-cols-2 gap-3">
              {/* Multi-brand select */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Marca</Label>
                <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal h-9 text-sm"
                    >
                      <span className="truncate">{brandButtonLabel}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="flex justify-between mb-2 pb-2 border-b">
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={selectAllBrands}
                      >
                        Seleccionar todas
                      </button>
                      <button
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={clearBrands}
                      >
                        Limpiar
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {brands.map((b) => (
                        <div
                          key={b}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted"
                        >
                          <Checkbox
                            id={`brand-${b}`}
                            checked={selectedBrands.includes(b)}
                            onCheckedChange={() => toggleBrand(b)}
                          />
                          <label
                            htmlFor={`brand-${b}`}
                            className="text-sm cursor-pointer flex-1 select-none"
                          >
                            {b}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedBrands.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          {selectedBrands.length} marca{selectedBrands.length !== 1 ? "s" : ""} seleccionada{selectedBrands.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category select */}
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

            {/* Selected brands tags */}
            {selectedBrands.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedBrands.map((b) => (
                  <Badge key={b} variant="secondary" className="gap-1 pr-1">
                    {b}
                    <button
                      onClick={() => toggleBrand(b)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Modo de precio */}
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Precio a mostrar en el PDF</Label>
              </div>
              <Select value={priceMode} onValueChange={(v) => setPriceMode(v as PriceMode)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Base + Mayorista (2 columnas)</SelectItem>
                  <SelectItem value="base">Solo Precio Base</SelectItem>
                  <SelectItem value="wholesale">Solo Precio Mayorista</SelectItem>
                  <SelectItem value="retail">Solo Precio Minorista</SelectItem>
                  <SelectItem value="discount">Base con descuento %</SelectItem>
                </SelectContent>
              </Select>
              {priceMode === "discount" && (
                <div className="flex items-center gap-2 pt-1">
                  <Label htmlFor="discount" className="text-xs text-muted-foreground whitespace-nowrap">
                    % descuento sobre Base:
                  </Label>
                  <div className="relative flex-1 max-w-[120px]">
                    <Input
                      id="discount"
                      type="text"
                      inputMode="decimal"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="h-8 pr-7 text-right"
                      placeholder="10"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                  {parsedDiscount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Ej: $1.000 → ${(1000 * (1 - parsedDiscount / 100)).toLocaleString("es-AR")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Only active toggle + grouping */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="onlyActive" checked={onlyActive} onCheckedChange={setOnlyActive} />
                <Label htmlFor="onlyActive" className="text-sm">
                  Solo productos activos
                </Label>
              </div>

              {/* Grouping toggle */}
              <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setGroupBy("category")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    groupBy === "category"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Categoría
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy("brand")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    groupBy === "brand"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  Marca
                </button>
              </div>
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

            {/* Preview table */}
            {!loading && filtered.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 font-medium">Producto</th>
                      <th className="text-left p-2 font-medium hidden sm:table-cell">Categoría</th>
                      <th className="text-left p-2 font-medium hidden sm:table-cell">Marca</th>
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
                        <td className="p-2 text-muted-foreground hidden sm:table-cell truncate max-w-[80px]">
                          {p.category || "-"}
                        </td>
                        <td className="p-2 text-muted-foreground hidden sm:table-cell truncate max-w-[80px]">
                          {p.brand || "-"}
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${Number(p.base_price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {p.wholesale_price != null
                            ? `$${Number(p.wholesale_price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                            : "-"}
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
