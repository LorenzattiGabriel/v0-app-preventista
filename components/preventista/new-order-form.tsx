"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Customer, Product, OrderPriority, OrderType } from "@/lib/types/database"
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { CustomerSelector } from "./customer-selector"

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
}

interface NewOrderFormProps {
  customers: Customer[]
  products: Product[]
  userId: string
}

export function NewOrderForm({ customers, products, userId }: NewOrderFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [deliveryDate, setDeliveryDate] = useState("")
  const [priority, setPriority] = useState<OrderPriority>("normal")
  const [orderType, setOrderType] = useState<OrderType>("presencial")
  const [requiresInvoice, setRequiresInvoice] = useState(false)
  const [observations, setObservations] = useState("")
  const [generalDiscount, setGeneralDiscount] = useState(0)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  // Add product form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [itemDiscount, setItemDiscount] = useState(0)

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    // Apply customer's general discount if exists
    if (customer.general_discount > 0) {
      setGeneralDiscount(customer.general_discount)
    }
  }

  const handleAddProduct = () => {
    if (!selectedProductId || quantity <= 0) return

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    // Determine price based on customer type
    let basePrice = product.base_price
    if (selectedCustomer?.customer_type === "mayorista" && product.wholesale_price) {
      basePrice = product.wholesale_price
    } else if (selectedCustomer?.customer_type === "minorista" && product.retail_price) {
      basePrice = product.retail_price
    }

    const unitPrice = customPrice !== null ? customPrice : basePrice
    const subtotal = quantity * unitPrice - itemDiscount

    const newItem: OrderItem = {
      productId: product.id,
      productName: `${product.name} ${product.brand ? `- ${product.brand}` : ""}`,
      quantity,
      unitPrice,
      discount: itemDiscount,
      subtotal,
    }

    setOrderItems([...orderItems, newItem])

    // Reset form
    setSelectedProductId("")
    setQuantity(1)
    setCustomPrice(null)
    setItemDiscount(0)
  }

  const handleRemoveProduct = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
    const total = subtotal - generalDiscount
    return { subtotal, total }
  }

  const handleSubmit = async (isDraft: boolean) => {
    if (!selectedCustomer) {
      setError("Debe seleccionar un cliente")
      return
    }

    if (!deliveryDate) {
      setError("Debe seleccionar una fecha de entrega")
      return
    }

    if (orderItems.length === 0) {
      setError("Debe agregar al menos un producto")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { subtotal, total } = calculateTotals()

      // Generate order number
      const { data: orderNumberData, error: orderNumberError  } = await supabase.rpc("generate_order_number")
      const orderNumber = orderNumberData as string

      if (!orderNumber) {
        console.error("Error generating order number");
        throw orderNumberError;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomer.id,
          order_date: new Date().toISOString().split("T")[0],
          delivery_date: deliveryDate,
          priority,
          order_type: orderType,
          status: isDraft ? "BORRADOR" : "PENDIENTE_ARMADO",
          subtotal,
          general_discount: generalDiscount,
          total,
          requires_invoice: requiresInvoice,
          created_by: userId,
          observations,
        })
        .select()
        .single()

      if (orderError) {
        console.error("Error creating order");
        throw orderError;
      }

      // Create order items
      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity_requested: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Create order history entry
      await supabase.from("order_history").insert({
        order_id: order.id,
        new_status: isDraft ? "BORRADOR" : "PENDIENTE_ARMADO",
        changed_by: userId,
        change_reason: isDraft ? "Borrador creado" : "Pedido creado",
      })

      router.push("/preventista/dashboard")
      router.refresh()
    } catch (err) {
      console.error("[v0] Error creating order:", err)
      setError(err instanceof Error ? err.message : "Error al crear el pedido")
    } finally {
      setIsLoading(false)
    }
  }

  const { subtotal, total } = calculateTotals()
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/preventista/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
          <CardDescription>Seleccione el cliente para este pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerSelector customers={customers} onSelect={handleCustomerSelect} selectedCustomer={selectedCustomer} />

          {selectedCustomer && (
            <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Dirección:</span>
                  <p className="text-muted-foreground">
                    {selectedCustomer.street} {selectedCustomer.street_number}
                    {selectedCustomer.floor_apt && `, ${selectedCustomer.floor_apt}`}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Localidad:</span>
                  <p className="text-muted-foreground">
                    {selectedCustomer.locality}, {selectedCustomer.province}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Teléfono:</span>
                  <p className="text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                <div>
                  <span className="font-medium">Tipo:</span>
                  <p className="text-muted-foreground capitalize">{selectedCustomer.customer_type}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Pedido</CardTitle>
          <CardDescription>Configure las opciones del pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as OrderPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Pedido</Label>
            <RadioGroup value={orderType} onValueChange={(value) => setOrderType(value as OrderType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="presencial" id="presencial" />
                <Label htmlFor="presencial" className="font-normal">
                  Presencial
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="web" id="web" />
                <Label htmlFor="web" className="font-normal">
                  Web
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="telefono" id="telefono" />
                <Label htmlFor="telefono" className="font-normal">
                  Teléfono
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" />
                <Label htmlFor="whatsapp" className="font-normal">
                  WhatsApp
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2 ">
            <input
              type="checkbox"
              id="requiresInvoice"
              checked={requiresInvoice}
              onChange={(e) => setRequiresInvoice(e.target.checked)}
              className="h-4 w-4 hover:cursor-pointer "
            />
            <Label htmlFor="requiresInvoice" className="font-normal hover:cursor-pointer ">
              Requiere Factura
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>Agregue productos al pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 space-y-2">
              <Label htmlFor="product">Producto</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.brand && `- ${product.brand}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="unitPrice">Precio Unit.</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                placeholder={
                  selectedProduct
                    ? selectedCustomer?.customer_type === "mayorista"
                      ? selectedProduct.wholesale_price?.toString() || selectedProduct.base_price.toString()
                      : selectedProduct.retail_price?.toString() || selectedProduct.base_price.toString()
                    : "0"
                }
                value={customPrice || ""}
                onChange={(e) => setCustomPrice(e.target.value ? Number.parseFloat(e.target.value) : null)}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="itemDiscount">Descuento</Label>
              <Input
                id="itemDiscount"
                type="number"
                step="0.01"
                min="0"
                value={itemDiscount}
                onChange={(e) => setItemDiscount(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="col-span-2 flex items-end">
              <Button onClick={handleAddProduct} disabled={!selectedProductId || quantity <= 0} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>

          {orderItems.length > 0 && (
            <div className="border rounded-md">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 text-sm font-medium">Producto</th>
                    <th className="text-right p-2 text-sm font-medium">Cantidad</th>
                    <th className="text-right p-2 text-sm font-medium">Precio Unit.</th>
                    <th className="text-right p-2 text-sm font-medium">Descuento</th>
                    <th className="text-right p-2 text-sm font-medium">Subtotal</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-sm">{item.productName}</td>
                      <td className="p-2 text-sm text-right">{item.quantity}</td>
                      <td className="p-2 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="p-2 text-sm text-right">${item.discount.toFixed(2)}</td>
                      <td className="p-2 text-sm text-right font-medium">${item.subtotal.toFixed(2)}</td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveProduct(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totales y Observaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generalDiscount">Descuento General ($)</Label>
            <Input
              id="generalDiscount"
              type="number"
              step="0.01"
              min="0"
              value={generalDiscount}
              onChange={(e) => setGeneralDiscount(Number.parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              placeholder="Notas adicionales sobre el pedido..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Descuento General:</span>
              <span className="font-medium text-destructive">-${generalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          Guardar Borrador
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={isLoading} size="lg">
          {isLoading ? "Creando..." : "Confirmar Pedido"}
        </Button>
      </div>
    </div>
  )
}
