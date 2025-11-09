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
import { useOrderFormActions } from "./use-order-form-actions"
import { GoBackButton } from "../ui/go-back-button"
interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
}

interface InitialOrderData {
  selectedCustomer: Customer | null
  deliveryDate: string
  priority: OrderPriority
  orderType: OrderType
  requiresInvoice: boolean
  observations: string
  generalDiscount: number
  orderItems: OrderItem[]
}

interface NewOrderFormProps {
  customers: Customer[]
  products: Product[]
  userId: string
  initialOrderData?: InitialOrderData
  orderId?: string // Added for editing existing orders
}

export function NewOrderForm({ customers, products, userId, initialOrderData, orderId }: NewOrderFormProps) {
  const router = useRouter()

  const { saveOrder, isLoading, error, setError, calculateTotals } = useOrderFormActions()

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialOrderData?.selectedCustomer || null)
  const [deliveryDate, setDeliveryDate] = useState(initialOrderData?.deliveryDate || "")
  const [priority, setPriority] = useState<OrderPriority>(initialOrderData?.priority || "normal")
  const [orderType, setOrderType] = useState<OrderType>(initialOrderData?.orderType || "presencial")
  const [requiresInvoice, setRequiresInvoice] = useState(initialOrderData?.requiresInvoice || false)
  const [observations, setObservations] = useState(initialOrderData?.observations || "")
  const [generalDiscount, setGeneralDiscount] = useState(initialOrderData?.generalDiscount || 0)
  const [orderItems, setOrderItems] = useState<OrderItem[]>(initialOrderData?.orderItems || [])

  // Add product form state
  const [selectedProductId, setSelectedProductId] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState<number | null>(null)
  const [itemDiscount, setItemDiscount] = useState(0)

  // Initialize order items if provided
  useState(() => {
    if (initialOrderData?.orderItems) setOrderItems(initialOrderData.orderItems)
  })

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

  const handleSaveOrder = async (isDraft: boolean) => {
    await saveOrder({
      selectedCustomer,
      deliveryDate,
      priority,
      orderType,
      requiresInvoice,
      observations,
      generalDiscount,
      orderItems,
      userId,
      isDraft,
      orderId, // Pass orderId if editing
    });
  }

  const { subtotal, total } = calculateTotals(orderItems, generalDiscount)
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <GoBackButton/>
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
        <Button variant="outline" onClick={() => handleSaveOrder(true)} disabled={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Guardando Borrador..." : "Guardar Borrador"}
        </Button>
        <Button onClick={() => handleSaveOrder(false)} disabled={isLoading} size="lg">
          {isLoading ? "Creando..." : "Confirmar Pedido"}
        </Button>
      </div>
    </div>
  )
}
