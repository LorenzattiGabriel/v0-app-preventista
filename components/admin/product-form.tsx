"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface ProductFormProps {
  product?: {
    id: string
    code: string
    name: string
    brand?: string
    description?: string
    category?: string
    base_price: number
    wholesale_price?: number
    retail_price?: number
    weight?: number
    volume?: number
    current_stock: number
    min_stock: number
    is_active: boolean
    barcode?: string
    iva_aliquot: number
    category_margin: number
    product_margin: number
    location?: string
    supplier?: string
    // 🆕 Configuración de cantidades decimales
    allows_decimal_quantity?: boolean
    unit_of_measure?: string
  }
  initialCode: string
}

export function ProductForm({ product, initialCode }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: product?.code || initialCode,
    name: product?.name || "",
    brand: product?.brand || "",
    description: product?.description || "",
    category: product?.category || "",
    base_price: product?.base_price?.toString() || "",
    wholesale_price: product?.wholesale_price?.toString() || "",
    retail_price: product?.retail_price?.toString() || "",
    weight: product?.weight?.toString() || "",
    volume: product?.volume?.toString() || "",
    current_stock: product?.current_stock?.toString() || "0",
    min_stock: product?.min_stock?.toString() || "0",
    is_active: product?.is_active ?? true,
    barcode: product?.barcode || "",
    iva_aliquot: product?.iva_aliquot?.toString() || "0",
    category_margin: product?.category_margin?.toString() || "0",
    product_margin: product?.product_margin?.toString() || "0",
    location: product?.location || "",
    supplier: product?.supplier || "",
    // 🆕 Configuración de cantidades decimales
    allows_decimal_quantity: product?.allows_decimal_quantity ?? false,
    unit_of_measure: product?.unit_of_measure || "unidad",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      const productData = {
        code: formData.code,
        name: formData.name,
        brand: formData.brand || null,
        description: formData.description || null,
        category: formData.category || null,
        base_price: parseFloat(formData.base_price),
        wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        current_stock: parseInt(formData.current_stock),
        min_stock: parseInt(formData.min_stock),
        is_active: formData.is_active,
        barcode: formData.barcode || null,
        iva_aliquot: parseFloat(formData.iva_aliquot),
        category_margin: parseFloat(formData.category_margin),
        product_margin: parseFloat(formData.product_margin),
        location: formData.location || null,
        supplier: formData.supplier || null,
        // 🆕 Configuración de cantidades decimales
        allows_decimal_quantity: formData.allows_decimal_quantity,
        unit_of_measure: formData.unit_of_measure || "unidad",
      }

      if (product) {
        // Update existing product
        const { error } = await supabase.from("products").update(productData).eq("id", product.id)

        if (error) {
          console.error("Error updating product:", error)
          alert("Error al actualizar el producto: " + error.message)
          return
        }

        alert("Producto actualizado exitosamente")
      } else {
        // Create new product
        const { error } = await supabase.from("products").insert(productData)

        if (error) {
          console.error("Error creating product:", error)
          alert("Error al crear el producto: " + error.message)
          return
        }

        alert("Producto creado exitosamente")
      }

      router.push("/admin/products")
      router.refresh()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Error al guardar el producto. Por favor, intente nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" asChild>
          <Link href="/admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Producto
            </>
          )}
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
          <CardDescription>Datos esenciales del producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">
                Código <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                disabled={!!product}
                placeholder="PROD-0001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nombre del producto"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Marca del producto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Categoría del producto"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción detallada del producto"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Precios</CardTitle>
          <CardDescription>Define los precios de venta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="base_price">
                Precio Base <span className="text-red-500">*</span>
              </Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wholesale_price">Precio Mayorista</Label>
              <Input
                id="wholesale_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.wholesale_price}
                onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retail_price">Precio Minorista</Label>
              <Input
                id="retail_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.retail_price}
                onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🆕 Sales Configuration - Decimal Quantities */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Venta</CardTitle>
          <CardDescription>Define cómo se vende este producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">Unidad de Medida</Label>
              <select
                id="unit_of_measure"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="g">Gramo (g)</option>
                <option value="litro">Litro</option>
                <option value="ml">Mililitro (ml)</option>
                <option value="metro">Metro</option>
                <option value="cm">Centímetro (cm)</option>
                <option value="docena">Docena</option>
                <option value="caja">Caja</option>
                <option value="pack">Pack</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Unidad en la que se vende el producto
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="allows_decimal_quantity">Permite Cantidades Decimales</Label>
                  <p className="text-sm text-muted-foreground">
                    Activa para productos vendidos por peso (ej: 1.5 kg de queso)
                  </p>
                </div>
                <Switch
                  id="allows_decimal_quantity"
                  checked={formData.allows_decimal_quantity}
                  onCheckedChange={(checked) => setFormData({ ...formData, allows_decimal_quantity: checked })}
                />
              </div>
              
              {formData.allows_decimal_quantity && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                  ✓ Los preventistas podrán pedir cantidades como 1.5, 2.25, etc.
                </div>
              )}
              
              {!formData.allows_decimal_quantity && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  Solo se permiten cantidades enteras (1, 2, 3...)
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax and Margins */}
      <Card>
        <CardHeader>
          <CardTitle>IVA y Márgenes</CardTitle>
          <CardDescription>Configuración de impuestos y márgenes de ganancia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="iva_aliquot">Alícuota IVA (%)</Label>
              <Input
                id="iva_aliquot"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.iva_aliquot}
                onChange={(e) => setFormData({ ...formData, iva_aliquot: e.target.value })}
                placeholder="21.00"
              />
              <p className="text-xs text-muted-foreground">Ej: 21% = 21.00</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_margin">Margen Categoría (%)</Label>
              <Input
                id="category_margin"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.category_margin}
                onChange={(e) => setFormData({ ...formData, category_margin: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Margen general de la categoría</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_margin">Margen Producto (%)</Label>
              <Input
                id="product_margin"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.product_margin}
                onChange={(e) => setFormData({ ...formData, product_margin: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Margen específico del producto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier and Barcode */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedor y Código de Barras</CardTitle>
          <CardDescription>Información de proveedor y códigos adicionales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Código EAN, UPC, etc."
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">Máximo 50 caracteres</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Properties */}
      <Card>
        <CardHeader>
          <CardTitle>Propiedades Físicas</CardTitle>
          <CardDescription>Peso y volumen del producto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                placeholder="0.000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Volumen (m³)</Label>
              <Input
                id="volume"
                type="number"
                step="0.001"
                min="0"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                placeholder="0.000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Location */}
      <Card>
        <CardHeader>
          <CardTitle>Ubicación en Depósito</CardTitle>
          <CardDescription>Localización física del producto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej: Estantería A - Nivel 3 - Posición 5"
              maxLength={255}
            />
            <p className="text-xs text-muted-foreground">
              Indica la ubicación exacta en el depósito para facilitar el picking
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stock */}
      <Card>
        <CardHeader>
          <CardTitle>Control de Stock</CardTitle>
          <CardDescription>Gestión de inventario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current_stock">Stock Actual</Label>
              <Input
                id="current_stock"
                type="number"
                min="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_stock">Stock Mínimo</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Se mostrará una alerta cuando el stock esté por debajo de este valor
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado</CardTitle>
          <CardDescription>Controla la disponibilidad del producto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Producto Activo</Label>
              <p className="text-sm text-muted-foreground">
                Los productos inactivos no están disponibles para nuevos pedidos
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

