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
} from "lucide-react"
import Link from "next/link"

interface StockCSVImportProps {
  userId: string
}

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "success" | "error"

interface ProductMatch extends ParsedProduct {
  productId?: string
  productName?: string
  previousStock?: number
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

  const handleDownloadTemplate = async () => {
    const supabase = createClient()
    
    const { data: products, error } = await supabase
      .from("products")
      .select("code, name, current_stock, min_stock")
      .eq("is_active", true)
      .order("code")

    if (error) {
      setError("Error al obtener productos")
      return
    }

    const csv = generateCSV(products || [])
    downloadCSV(csv, `stock_productos_${new Date().toISOString().split('T')[0]}.csv`)
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
        .select("id, code, name, current_stock")
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
          }
        }

        const willUpdate = dbProduct.current_stock !== p.currentStock

        return {
          ...p,
          productId: dbProduct.id,
          productName: dbProduct.name,
          previousStock: dbProduct.current_stock,
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
        currentStock: p.previousStock!,  // Stock actual en DB
        newStock: p.currentStock,         // Nuevo stock del CSV
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
          <h1 className="text-2xl font-bold">Importar Stock (CSV)</h1>
          <p className="text-muted-foreground">Actualiza el stock de múltiples productos desde un archivo CSV</p>
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
            <li>Modifica los valores de <code className="bg-muted px-1 rounded">current_stock</code> en el archivo</li>
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
            <CardDescription>Selecciona un archivo CSV con las columnas: code, name, current_stock, min_stock</CardDescription>
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
          <div className="grid gap-4 md:grid-cols-3">
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
                    <p className="text-sm text-muted-foreground">Sin Cambios</p>
                    <p className="text-2xl font-bold text-muted-foreground">{unchangedProducts.length}</p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-muted-foreground" />
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
                Se actualizarán {validProducts.length} productos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Nuevo Stock</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.map((product, index) => {
                      const diff = product.willUpdate 
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
                          <TableCell>{product.productName || product.name || "-"}</TableCell>
                          <TableCell className="text-right">
                            {product.previousStock !== undefined ? product.previousStock : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {product.currentStock}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                            {product.willUpdate ? (diff > 0 ? `+${diff}` : diff) : "-"}
                          </TableCell>
                          <TableCell>
                            {!product.isValid ? (
                              <Badge variant="destructive">{product.error}</Badge>
                            ) : product.willUpdate ? (
                              <Badge variant="default" className="bg-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Actualizar
                              </Badge>
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
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Productos actualizados</p>
                <p className="text-2xl font-bold text-green-600">{importResult.totalUpdated}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sin cambios</p>
                <p className="text-2xl font-bold text-muted-foreground">{importResult.totalSkipped}</p>
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
                  Ver Historial de Movimientos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

