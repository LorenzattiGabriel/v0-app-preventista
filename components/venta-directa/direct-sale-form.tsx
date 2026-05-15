"use client"

// Form de venta directa. Una sola pantalla:
// cliente → items → pago → confirmar (en una sola transacción atómica).
// Reusa CustomerSelector y ProductSelector del módulo preventista.

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ShoppingCart,
} from "lucide-react"
import { toast } from "sonner"
import type { Customer, Product, PaymentLine } from "@/lib/types/database"
import type { CartLine } from "@/lib/types/venta-directa"
import { CustomerSelector } from "@/components/preventista/customer-selector"
import { ProductSelector } from "@/components/preventista/product-selector"
import { PaymentMethodsInput } from "@/components/shared/payment-methods-input"
import { DownloadSaleReceiptButton } from "@/components/venta-directa/download-sale-receipt-button"
import { confirmDirectSaleAction } from "@/app/venta-directa/actions"
import {
  calcCartTotals,
  calcLineSubtotal,
  toNum,
} from "@/lib/utils/cart-calculations"

interface DirectSaleFormProps {
  customers: Customer[]
  products: Product[]
}

// Clave usada para persistir el carrito mientras el usuario se va a crear
// un cliente nuevo. Si vuelve, se restaura.
const CART_DRAFT_KEY = "venta_directa_cart_draft"

interface PersistedCart {
  lines: CartLine[]
  observations: string
  generalDiscount: number
  generalDiscountType: "fixed" | "percentage"
  paymentLines: PaymentLine[]
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  // Fallback: improbable que se ejecute en navegadores modernos
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getDefaultPrice(p: Product, customerType?: string): number {
  if (customerType === "mayorista" && p.wholesale_price) return p.wholesale_price
  if (customerType === "minorista" && p.retail_price) return p.retail_price
  return p.base_price
}

export function DirectSaleForm({ customers, products }: DirectSaleFormProps) {
  const router = useRouter()

  // Estado del carrito
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [lines, setLines] = useState<CartLine[]>([])
  const [observations, setObservations] = useState("")
  const [generalDiscount, setGeneralDiscount] = useState(0)
  const [generalDiscountType, setGeneralDiscountType] = useState<
    "fixed" | "percentage"
  >("fixed")

  // Pagos
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([])

  // Formulario "agregar item"
  const [selectedProductId, setSelectedProductId] = useState("")
  const [qty, setQty] = useState(1)
  // Input crudo para cantidad cuando es por peso (mantiene la coma decimal mientras tipea)
  const [rawQty, setRawQty] = useState<string>("1")
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [itemDiscount, setItemDiscount] = useState(0)
  const [itemDiscountType, setItemDiscountType] = useState<
    "fixed" | "percentage"
  >("fixed")

  // Estado de envío
  const [idempotencyKey, setIdempotencyKey] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resultado de la venta confirmada (para mostrar dialog con descarga de remito)
  const [confirmed, setConfirmed] = useState<{
    orderId: string
    orderNumber: string
  } | null>(null)

  // Generar idempotency key una sola vez (cliente)
  useEffect(() => {
    setIdempotencyKey(newIdempotencyKey())
  }, [])

  // Si el usuario se fue a crear un cliente nuevo y volvió, restaurar el carrito.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as PersistedCart
      if (Array.isArray(draft.lines) && draft.lines.length > 0) {
        setLines(draft.lines)
      }
      if (typeof draft.observations === "string") setObservations(draft.observations)
      if (typeof draft.generalDiscount === "number") setGeneralDiscount(draft.generalDiscount)
      if (draft.generalDiscountType === "fixed" || draft.generalDiscountType === "percentage") {
        setGeneralDiscountType(draft.generalDiscountType)
      }
      if (Array.isArray(draft.paymentLines)) setPaymentLines(draft.paymentLines)
      sessionStorage.removeItem(CART_DRAFT_KEY)
    } catch {
      // Ignorar errores de parsing — sesión corrupta
      sessionStorage.removeItem(CART_DRAFT_KEY)
    }
  }, [])

  // Persiste el carrito antes de navegar al alta de cliente.
  // El customer recién creado lo levanta el CustomerSelector via su propio sessionStorage.
  const persistCartBeforeNewCustomer = () => {
    const draft: PersistedCart = {
      lines,
      observations,
      generalDiscount,
      generalDiscountType,
      paymentLines,
    }
    try {
      sessionStorage.setItem(CART_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Storage lleno o deshabilitado: el carrito se pierde, no es crítico.
    }
  }

  // Auto-cargar precio al seleccionar producto
  useEffect(() => {
    if (!selectedProductId) {
      setUnitPrice(0)
      return
    }
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return
    setUnitPrice(getDefaultPrice(product, customer?.customer_type))
    // Reset de cantidad al elegir producto nuevo
    setQty(1)
    setRawQty("1")
  }, [selectedProductId, customer?.customer_type, products])

  const totals = useMemo(
    () => calcCartTotals(lines, generalDiscount, generalDiscountType),
    [lines, generalDiscount, generalDiscountType],
  )

  const addLine = () => {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) {
      setError("Seleccioná un producto antes de agregarlo")
      return
    }
    if (qty <= 0) {
      setError("La cantidad debe ser mayor a 0")
      return
    }
    if (qty > toNum(product.current_stock)) {
      setError(
        `Stock insuficiente. Disponible: ${product.current_stock} ${product.unit_of_measure}`,
      )
      return
    }
    const subtotal = calcLineSubtotal(unitPrice, qty, itemDiscount, itemDiscountType)
    const line: CartLine = {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unitOfMeasure: product.unit_of_measure,
      allowsDecimal: product.allows_decimal_quantity,
      saleUnit: product.allows_decimal_quantity && product.unit_of_measure === "kg" ? "peso" : "unidad",
      quantity: qty,
      unitPrice,
      discount: itemDiscount,
      discountType: itemDiscountType,
      subtotal,
    }
    setLines((prev) => [...prev, line])
    // Reset
    setSelectedProductId("")
    setQty(1)
    setRawQty("1")
    setUnitPrice(0)
    setItemDiscount(0)
    setItemDiscountType("fixed")
    setError(null)
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError(null)

    if (!customer) {
      setError("Seleccioná un cliente")
      return
    }
    if (lines.length === 0) {
      setError("Agregá al menos un producto")
      return
    }
    if (paymentLines.length === 0) {
      setError("Registrá al menos un método de pago")
      return
    }

    const totalPaid = paymentLines.reduce((s, p) => s + toNum(p.amount), 0)
    if (Math.abs(totalPaid - totals.total) > 0.01) {
      setError(
        `El total de pagos ($${totalPaid.toFixed(2)}) no coincide con el total de la venta ($${totals.total.toFixed(2)})`,
      )
      return
    }

    setIsSubmitting(true)

    const input = {
      customerId: customer.id,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discountType === "percentage"
          ? (l.unitPrice * l.quantity * l.discount) / 100
          : l.discount,
        subtotal: l.subtotal,
      })),
      paymentMethods: paymentLines,
      generalDiscount,
      generalDiscountType,
      observations: observations || undefined,
      idempotencyKey,
    }

    const result = await confirmDirectSaleAction(input)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    toast.success(
      result.data.duplicated
        ? "Venta ya registrada previamente"
        : `Venta ${result.data.orderNumber} registrada`,
    )
    setConfirmed({
      orderId: result.data.orderId,
      orderNumber: result.data.orderNumber,
    })
  }

  const handleNuevaVenta = () => {
    // Reset total del form para registrar otra venta sin recargar la página
    setConfirmed(null)
    setCustomer(null)
    setLines([])
    setObservations("")
    setGeneralDiscount(0)
    setGeneralDiscountType("fixed")
    setPaymentLines([])
    setSelectedProductId("")
    setQty(1)
    setRawQty("1")
    setUnitPrice(0)
    setItemDiscount(0)
    setItemDiscountType("fixed")
    setError(null)
    setIdempotencyKey(newIdempotencyKey())
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const lineSubtotalPreview = selectedProduct
    ? calcLineSubtotal(unitPrice, qty, itemDiscount, itemDiscountType)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/venta-directa/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerSelector
            customers={customers}
            onSelect={setCustomer}
            selectedCustomer={customer}
            newCustomerHref="/venta-directa/clientes/nuevo"
            onBeforeNewCustomer={persistCartBeforeNewCustomer}
          />
          {customer && (
            <div className="mt-2 text-sm text-muted-foreground">
              Tipo: {customer.customer_type === "mayorista" ? "Mayorista" : "Minorista"}
              {customer.current_balance > 0 && (
                <span className="ml-2 text-orange-600">
                  · Saldo deudor: ${customer.current_balance.toLocaleString("es-AR")}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] items-end">
            <ProductSelector
              products={products}
              selectedProduct={selectedProduct || null}
              onSelect={(p) => setSelectedProductId(p?.id || "")}
              customerType={customer?.customer_type}
            />
            <div>
              <Label>
                Cantidad
                {selectedProduct?.allows_decimal_quantity && selectedProduct.unit_of_measure === "kg" && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">(kg, usá coma decimal)</span>
                )}
              </Label>
              {selectedProduct?.allows_decimal_quantity ? (
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 1,250"
                  value={rawQty}
                  onChange={(e) => {
                    const raw = e.target.value
                    setRawQty(raw)
                    const normalized = raw.replace(",", ".")
                    if (normalized === "") {
                      setQty(0)
                      return
                    }
                    const v = Number.parseFloat(normalized)
                    setQty(isNaN(v) ? 0 : Math.max(0, v))
                  }}
                />
              ) : (
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={qty}
                  onChange={(e) => {
                    const v = toNum(e.target.value)
                    setQty(v)
                    setRawQty(String(v))
                  }}
                />
              )}
              {selectedProduct && (
                <p className="text-xs text-muted-foreground mt-1">
                  Stock: {selectedProduct.current_stock} {selectedProduct.unit_of_measure}
                </p>
              )}
            </div>
            <div>
              <Label>Precio unitario</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(toNum(e.target.value))}
              />
            </div>
            <Button type="button" onClick={addLine} disabled={!selectedProductId}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr] items-end">
            <div>
              <Label>Descuento por línea</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={itemDiscount}
                onChange={(e) => setItemDiscount(toNum(e.target.value))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={itemDiscountType}
                onValueChange={(v) =>
                  setItemDiscountType(v as "fixed" | "percentage")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">$ (fijo)</SelectItem>
                  <SelectItem value="percentage">% (porcentaje)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedProduct && (
            <div className="text-sm text-muted-foreground">
              Subtotal de esta línea:{" "}
              <span className="font-medium text-foreground">
                ${lineSubtotalPreview.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2 text-right">Precio</th>
                    <th className="px-3 py-2 text-right">Desc.</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        {l.productCode} — {l.productName}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {l.allowsDecimal
                          ? l.quantity.toLocaleString("es-AR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                          : l.quantity}{" "}
                        {l.unitOfMeasure}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ${l.unitPrice.toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {l.discount > 0
                          ? l.discountType === "percentage"
                            ? `${l.discount}%`
                            : `$${l.discount.toLocaleString("es-AR")}`
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        ${l.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(idx)}
                          aria-label="Quitar"
                        >
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
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr] items-end">
            <div>
              <Label>Descuento general</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={generalDiscount}
                onChange={(e) => setGeneralDiscount(toNum(e.target.value))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={generalDiscountType}
                onValueChange={(v) =>
                  setGeneralDiscountType(v as "fixed" | "percentage")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">$ (fijo)</SelectItem>
                  <SelectItem value="percentage">% (porcentaje)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas internas (opcional)"
              maxLength={500}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${totals.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
            {totals.generalDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Descuento general</span>
                <span>-${totals.generalDiscountAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t pt-2">
              <span>Total</span>
              <span>${totals.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <PaymentMethodsInput
            value={paymentLines}
            onChange={setPaymentLines}
            expectedTotal={totals.total}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={isSubmitting || lines.length === 0 || !customer}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar venta
            </>
          )}
        </Button>
      </div>

      <Dialog
        open={!!confirmed}
        onOpenChange={(open) => {
          if (!open) {
            // Si cierra el dialog sin elegir, lo mandamos al detalle
            const id = confirmed?.orderId
            setConfirmed(null)
            if (id) router.push(`/venta-directa/ventas/${id}`)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Venta confirmada
            </DialogTitle>
            <DialogDescription>
              {confirmed && (
                <>
                  Se registr&oacute; la venta <strong>{confirmed.orderNumber}</strong>.
                  Pod&eacute;s descargar el remito ahora o desde el detalle de la venta.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {confirmed && (
              <DownloadSaleReceiptButton
                saleId={confirmed.orderId}
                variant="default"
                size="default"
              >
                Descargar remito
              </DownloadSaleReceiptButton>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const id = confirmed?.orderId
                setConfirmed(null)
                if (id) router.push(`/venta-directa/ventas/${id}`)
              }}
            >
              Ver detalle
            </Button>
            <Button type="button" variant="ghost" onClick={handleNuevaVenta}>
              Nueva venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
