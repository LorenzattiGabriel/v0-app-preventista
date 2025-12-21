"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createStockMovementsService } from "@/lib/services/stockMovementsService"
import { parseCSV, generateCSV, downloadCSV, type ParsedProduct } from "@/lib/utils/csv-parser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Package,
  DollarSign,
} from "lucide-react"
import Link from "next/link"

interface StockCSVImportProps {
  userId: string
}

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "success" | "error"

interface ProductMatch extends ParsedProduct {
  productId?: string
  productName?: string
  // Stock
  previousStock?: number
  stockChanged: boolean
  // Precios
  previousBasePrice?: number | null
  previousWholesalePrice?: number | null
  previousRetailPrice?: number | null
  basePriceChanged: boolean
  wholesalePriceChanged: boolean
  retailPriceChanged: boolean
  // General
  willUpdate: boolean
}

export function StockCSVImport({ userId }: StockCSVImportProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [status, setStatus] = useState<ImportStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [parsedProducts, setParsedProducts] = useState<ProductMatch[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    totalUpdated: number
    totalSkipped: number
    totalProcessed: number
    stockChanges: number
    priceChanges: number
    batchId: string
    errors: Array<{ code: string; error: string }>
  } | null>(null)

  const validProducts = parsedProducts.filter(p => p.isValid && p.willUpdate)
  const invalidProducts = parsedProducts.filter(p => !p.isValid)
  const unchangedProducts = parsedProducts.filter(p => p.isValid && !p.willUpdate)

  // Ordenar: primero los que se van a actualizar, luego sin cambios, luego errores
  const sortedProducts = [
    ...validProducts,
    ...unchangedProducts,
    ...invalidProducts,
  ]

  // Contar cambios por tipo
  const stockChangesCount = validProducts.filter(p => p.stockChanged).length
  const priceChangesCount = validProducts.filter(p => p.basePriceChanged || p.wholesalePriceChanged || p.retailPriceChanged).length

  const handleDownloadTemplate = async () => {
    const supabase = createClient()
    
    const { data: products, error } = await supabase
      .from("products")
      .select("code, name, current_stock, min_stock, base_price, wholesale_price, retail_price")
      .eq("is_active", true)
      .order("code")

    if (error) {
      setError("Error al obtener productos")
      return
    }

    const csv = generateCSV(products || [])
    downloadCSV(csv, `productos_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus("parsing")
    setError(null)
    setParsedProducts([])

    try {
      const content = await file.text()
      const parsed = parseCSV(content)

      // Buscar productos en la base de datos
      const supabase = createClient()
      const codes = parsed.map(p => p.code)
      
      const { data: dbProducts, error: dbError } = await supabase
        .from("products")
        .select("id, code, name, current_stock, base_price, wholesale_price, retail_price")
        .in("code", codes)

      if (dbError) throw dbError

      // Mapear productos parseados con los de la base de datos
      const productMap = new Map(dbProducts?.map(p => [p.code, p]) || [])

      const matched: ProductMatch[] = parsed.map(p => {
        const dbProduct = productMap.get(p.code)
        
        if (!dbProduct) {
          return {
            ...p,
            isValid: false,
            error: "Producto no encontrado en la base de datos",
            willUpdate: false,
            stockChanged: false,
            basePriceChanged: false,
            wholesalePriceChanged: false,
            retailPriceChanged: false,
          }
        }

        // Detectar cambios
        const stockChanged = p.currentStock !== dbProduct.current_stock
        const basePriceChanged = p.basePrice !== null && p.basePrice !== dbProduct.base_price
        const wholesalePriceChanged = p.wholesalePrice !== null && p.wholesalePrice !== dbProduct.wholesale_price
        const retailPriceChanged = p.retailPrice !== null && p.retailPrice !== dbProduct.retail_price
        
        const willUpdate = stockChanged || basePriceChanged || wholesalePriceChanged || retailPriceChanged

        return {
          ...p,
          productId: dbProduct.id,
          productName: dbProduct.name,
          previousStock: dbProduct.current_stock,
          previousBasePrice: dbProduct.base_price,
          previousWholesalePrice: dbProduct.wholesale_price,
          previousRetailPrice: dbProduct.retail_price,
          stockChanged,
          basePriceChanged,
          wholesalePriceChanged,
          retailPriceChanged,
          willUpdate,
          isValid: p.isValid,
        }
      })

      setParsedProducts(matched)
      setStatus("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al parsear el archivo")
      setStatus("error")
    }

    // Limpiar input para permitir volver a seleccionar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImport = async () => {
    if (validProducts.length === 0) {
      setError("No hay productos válidos para importar")
      return
    }

    setStatus("importing")
    setImportProgress(0)

    try {
      const supabase = createClient()
      const stockService = createStockMovementsService(supabase)

      const updates = validProducts.map(p => ({
        productId: p.productId!,
        productCode: p.code,
        productName: p.productName!,
        // Stock
        currentStock: p.previousStock!,
        newStock: p.stockChanged ? p.currentStock : null,
        // Precios
        currentBasePrice: p.previousBasePrice,
        newBasePrice: p.basePriceChanged ? p.basePrice : null,
        currentWholesalePrice: p.previousWholesalePrice,
        newWholesalePrice: p.wholesalePriceChanged ? p.wholesalePrice : null,
        currentRetailPrice: p.previousRetailPrice,
        newRetailPrice: p.retailPriceChanged ? p.retailPrice : null,
      }))

      const result = await stockService.bulkUpdateStock(
        updates,
        userId,
        `Importación CSV - ${new Date().toLocaleDateString("es-AR")}`
      )

      setImportResult(result)
      setImportProgress(100)
      setStatus("success")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar")
      setStatus("error")
    }
  }

  const handleReset = () => {
    setStatus("idle")
    setError(null)
    setParsedProducts([])
    setImportProgress(0)
    setImportResult(null)
  }

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return "-"
    return `$${price.toLocaleString("es-AR")}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Actualización Masiva de Productos</h1>
          <p className="text-muted-foreground">Actualiza stock y precios de múltiples productos desde un archivo CSV</p>
        </div>
      </div>

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Instrucciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Descarga la plantilla CSV con los productos actuales</li>
            <li>Modifica los valores que desees actualizar:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li><code className="bg-muted px-1 rounded">current_stock</code> - Stock actual</li>
                <li><code className="bg-muted px-1 rounded">base_price</code> - Precio base</li>
                <li><code className="bg-muted px-1 rounded">wholesale_price</code> - Precio mayorista</li>
                <li><code className="bg-muted px-1 rounded">retail_price</code> - Precio minorista</li>
              </ul>
            </li>
            <li>Sube el archivo modificado</li>
            <li>Revisa la vista previa de cambios</li>
            <li>Confirma la importación</li>
          </ol>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload */}
      {(status === "idle" || status === "error") && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Archivo CSV</CardTitle>
            <CardDescription>Selecciona un archivo CSV con la plantilla descargada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="max-w-sm"
              />
              <Label className="text-sm text-muted-foreground">Archivos .csv solamente</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsing */}
      {status === "parsing" && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Procesando archivo...</p>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {status === "preview" && (
        <>
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">A Actualizar</p>
                    <p className="text-2xl font-bold text-green-600">{validProducts.length}</p>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cambios Stock</p>
                    <p className="text-2xl font-bold text-blue-600">{stockChangesCount}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cambios Precio</p>
                    <p className="text-2xl font-bold text-purple-600">{priceChangesCount}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Con Errores</p>
                    <p className="text-2xl font-bold text-red-600">{invalidProducts.length}</p>
                  </div>
                  <X className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa de Cambios</CardTitle>
              <CardDescription>
                Se actualizarán {validProducts.length} productos ({stockChangesCount} stock, {priceChangesCount} precios)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background">Código</TableHead>
                      <TableHead className="sticky top-0 bg-background">Producto</TableHead>
                      <TableHead className="sticky top-0 bg-background text-right">Stock</TableHead>
                      <TableHead className="sticky top-0 bg-background text-right">Precio Base</TableHead>
                      <TableHead className="sticky top-0 bg-background text-right">P. Mayorista</TableHead>
                      <TableHead className="sticky top-0 bg-background text-right">P. Minorista</TableHead>
                      <TableHead className="sticky top-0 bg-background">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.map((product, index) => {
                      const stockDiff = product.stockChanged 
                        ? product.currentStock - (product.previousStock || 0)
                        : 0
                      
                      return (
                        <TableRow 
                          key={index} 
                          className={
                            !product.isValid 
                              ? "bg-red-50 dark:bg-red-950" 
                              : product.willUpdate 
                                ? "bg-green-50 dark:bg-green-950" 
                                : ""
                          }
                        >
                          <TableCell className="font-mono">{product.code}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{product.productName || product.name || "-"}</TableCell>
                          <TableCell className="text-right">
                            {product.stockChanged ? (
                              <span className={stockDiff > 0 ? "text-green-600" : stockDiff < 0 ? "text-red-600" : ""}>
                                {product.previousStock} → <strong>{product.currentStock}</strong>
                                <span className="text-xs ml-1">({stockDiff > 0 ? `+${stockDiff}` : stockDiff})</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{product.previousStock ?? product.currentStock}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.basePriceChanged ? (
                              <span className="text-purple-600">
                                {formatPrice(product.previousBasePrice)} → <strong>{formatPrice(product.basePrice)}</strong>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{formatPrice(product.previousBasePrice ?? product.basePrice)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.wholesalePriceChanged ? (
                              <span className="text-purple-600">
                                {formatPrice(product.previousWholesalePrice)} → <strong>{formatPrice(product.wholesalePrice)}</strong>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{formatPrice(product.previousWholesalePrice ?? product.wholesalePrice)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.retailPriceChanged ? (
                              <span className="text-purple-600">
                                {formatPrice(product.previousRetailPrice)} → <strong>{formatPrice(product.retailPrice)}</strong>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{formatPrice(product.previousRetailPrice ?? product.retailPrice)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!product.isValid ? (
                              <Badge variant="destructive">{product.error}</Badge>
                            ) : product.willUpdate ? (
                              <div className="flex flex-wrap gap-1">
                                {product.stockChanged && (
                                  <Badge variant="default" className="bg-blue-600">
                                    <Package className="h-3 w-3 mr-1" />
                                    Stock
                                  </Badge>
                                )}
                                {(product.basePriceChanged || product.wholesalePriceChanged || product.retailPriceChanged) && (
                                  <Badge variant="default" className="bg-purple-600">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    Precio
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary">Sin cambios</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleReset}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={validProducts.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar {validProducts.length} productos
            </Button>
          </div>
        </>
      )}

      {/* Importing */}
      {status === "importing" && (
        <Card>
          <CardContent className="py-12 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Importando productos...</p>
            </div>
            <Progress value={importProgress} />
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {status === "success" && importResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Check className="h-6 w-6" />
              Importación Completada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Productos actualizados</p>
                <p className="text-2xl font-bold text-green-600">{importResult.totalUpdated}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cambios de stock</p>
                <p className="text-2xl font-bold text-blue-600">{importResult.stockChanges}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cambios de precio</p>
                <p className="text-2xl font-bold text-purple-600">{importResult.priceChanges}</p>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Con errores</p>
                  <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-red-700">Errores:</p>
                <ul className="list-disc list-inside text-sm text-red-600">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err.code}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              ID de lote: <code className="bg-muted px-1 rounded">{importResult.batchId}</code>
            </p>

            <div className="flex gap-4">
              <Button onClick={handleReset} variant="outline">
                Nueva Importación
              </Button>
              <Button asChild>
                <Link href="/admin/products/stock-history">
                  Ver Historial de Actualizaciones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
