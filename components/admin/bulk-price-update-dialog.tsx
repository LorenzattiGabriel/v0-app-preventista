"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, TrendingUp, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Product {
  id: string
  code: string
  name: string
  brand: string | null
  base_price: number
  wholesale_price: number | null
  retail_price: number | null
  is_active: boolean
}

interface BulkPriceUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function BulkPriceUpdateDialog({ open, onOpenChange, onSuccess }: BulkPriceUpdateDialogProps) {
  const router = useRouter()
  const [brandSearch, setBrandSearch] = useState("")
  const [brands, setBrands] = useState<string[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [percentage, setPercentage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  // Load brands on open
  useEffect(() => {
    if (open) {
      loadBrands()
      resetState()
    }
  }, [open])

  const resetState = () => {
    setBrandSearch("")
    setSelectedBrand(null)
    setProducts([])
    setSelectedIds(new Set())
    setPercentage("")
    setError(null)
    setResult(null)
  }

  const loadBrands = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("products")
      .select("brand")
      .not("brand", "is", null)
      .eq("is_active", true)

    if (data) {
      const uniqueBrands = [...new Set(data.map((p) => p.brand).filter(Boolean))] as string[]
      setBrands(uniqueBrands.sort())
    }
  }

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands
    const search = brandSearch.toLowerCase()
    return brands.filter((b) => b.toLowerCase().includes(search))
  }, [brands, brandSearch])

  const loadProductsByBrand = async (brand: string) => {
    setLoadingProducts(true)
    setSelectedBrand(brand)
    setBrandSearch(brand)
    setError(null)

    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from("products")
      .select("id, code, name, brand, base_price, wholesale_price, retail_price, is_active")
      .eq("brand", brand)
      .eq("is_active", true)
      .order("name")

    if (fetchError) {
      setError("Error al cargar productos")
    } else {
      setProducts(data || [])
      // Select all by default
      setSelectedIds(new Set((data || []).map((p) => p.id)))
    }
    setLoadingProducts(false)
  }

  const toggleAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)))
    }
  }

  const toggleProduct = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const pct = Number.parseFloat(percentage) || 0
  const multiplier = 1 + pct / 100
  const round2 = (n: number) => Math.round(n * 100) / 100

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      setError("Selecciona al menos un producto")
      return
    }
    if (pct === 0) {
      setError("El porcentaje debe ser distinto de cero")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/products/bulk-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_ids: Array.from(selectedIds),
          percentage: pct,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar precios")
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (result) {
      onSuccess()
      router.refresh()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actualizar Precios por Marca
          </DialogTitle>
          <DialogDescription>
            Selecciona una marca y aplica un porcentaje de incremento o descuento a los precios
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Success view
          <div className="space-y-4 py-4">
            <Alert className="border-green-300 bg-green-50 dark:bg-green-950/30">
              <AlertDescription className="text-green-800 dark:text-green-300">
                <p className="font-medium">Precios actualizados correctamente</p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>Productos procesados: {result.totalProcessed}</li>
                  <li>Precios actualizados: {result.priceChanges}</li>
                  {result.totalSkipped > 0 && <li>Sin cambios: {result.totalSkipped}</li>}
                </ul>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          // Form view
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Brand search */}
            <div className="space-y-2">
              <Label>Marca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar marca..."
                  value={brandSearch}
                  onChange={(e) => {
                    setBrandSearch(e.target.value)
                    if (selectedBrand) {
                      setSelectedBrand(null)
                      setProducts([])
                      setSelectedIds(new Set())
                    }
                  }}
                  className="pl-9"
                />
              </div>
              {!selectedBrand && brandSearch && filteredBrands.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {filteredBrands.map((brand) => (
                    <button
                      key={brand}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      onClick={() => loadProductsByBrand(brand)}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}
              {!selectedBrand && brandSearch && filteredBrands.length === 0 && (
                <p className="text-sm text-muted-foreground">No se encontraron marcas</p>
              )}
            </div>

            {/* Products list */}
            {loadingProducts && (
              <div className="text-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            )}

            {selectedBrand && products.length > 0 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Productos de "{selectedBrand}" ({products.length})</Label>
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedIds.size === products.length ? "Deseleccionar todos" : "Seleccionar todos"}
                    </Button>
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                    {products.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.code}</p>
                        </div>
                        <div className="text-right text-xs space-y-0.5 shrink-0">
                          <p>Base: ${product.base_price.toLocaleString("es-AR")}</p>
                          {product.wholesale_price && (
                            <p className="text-muted-foreground">May: ${product.wholesale_price.toLocaleString("es-AR")}</p>
                          )}
                          {product.retail_price && (
                            <p className="text-muted-foreground">Min: ${product.retail_price.toLocaleString("es-AR")}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Percentage input */}
                <div className="space-y-2">
                  <Label htmlFor="percentage">Porcentaje de ajuste (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="percentage"
                      type="number"
                      step="0.1"
                      placeholder="Ej: 10 para +10%, -5 para -5%"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                      className="flex-1"
                    />
                    {pct !== 0 && (
                      <Badge variant={pct > 0 ? "default" : "destructive"}>
                        {pct > 0 ? "+" : ""}{pct}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Preview */}
                {pct !== 0 && selectedIds.size > 0 && (
                  <div className="space-y-2">
                    <Label>Preview ({selectedIds.size} productos)</Label>
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y text-xs">
                      <div className="grid grid-cols-4 gap-2 px-3 py-1.5 bg-muted font-medium sticky top-0">
                        <span>Producto</span>
                        <span className="text-right">Base Actual</span>
                        <span className="text-right">Base Nuevo</span>
                        <span className="text-right">Dif.</span>
                      </div>
                      {products
                        .filter((p) => selectedIds.has(p.id))
                        .map((p) => {
                          const newPrice = round2(p.base_price * multiplier)
                          const diff = round2(newPrice - p.base_price)
                          return (
                            <div key={p.id} className="grid grid-cols-4 gap-2 px-3 py-1.5">
                              <span className="truncate">{p.name}</span>
                              <span className="text-right">${p.base_price.toLocaleString("es-AR")}</span>
                              <span className={`text-right font-medium ${pct > 0 ? "text-red-600" : "text-green-600"}`}>
                                ${newPrice.toLocaleString("es-AR")}
                              </span>
                              <span className={`text-right ${pct > 0 ? "text-red-500" : "text-green-500"}`}>
                                {diff > 0 ? "+" : ""}${diff.toLocaleString("es-AR")}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedBrand && products.length === 0 && !loadingProducts && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay productos activos para esta marca
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || selectedIds.size === 0 || pct === 0}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aplicar {pct > 0 ? "+" : ""}{pct}% a {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
