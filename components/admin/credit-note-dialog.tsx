"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileMinus, Loader2, Plus, Trash2 } from "lucide-react"
import { downloadCreditNote } from "@/lib/credit-note-generator"
import type { CreditNoteDisposition, CreditNoteResolution } from "@/lib/types/database"

interface ProductOption {
  id: string
  name: string
  brand?: string | null
  base_price?: number | null
}

/** Item de un pedido entregado, candidato a devolución. */
interface OrderItemOption {
  productId: string
  productName: string
  /** Por unidad: precio por unidad. Por peso: precio por kg. */
  unitPrice: number
  /** Tope a devolver: por unidad = unidades; por peso = PIEZAS entregadas. */
  maxQuantity: number
  /** 'peso' habilita el input de kg para la devolución. */
  saleUnit?: "unidad" | "peso" | null
  /** Kg entregados de la línea (tope del peso a devolver). Solo saleUnit='peso'. */
  deliveredKg?: number | null
}

/** Pedido entregado sobre el que se puede emitir la NC. */
export interface OrderForCreditNote {
  id: string
  order_number: string
  invoice_type?: "A" | "B" | "C" | null
  items: OrderItemOption[]
}

interface CustomerForPdf {
  commercial_name?: string
  street?: string
  street_number?: string
  locality?: string
  province?: string
  phone?: string
}

interface CreditNoteDialogProps {
  customerId: string
  customerName: string
  customer: CustomerForPdf
  /** Productos para elegir el/los de reemplazo (solo resolución 'reemplazo'). */
  products: ProductOption[]
  /** Modo fijo: NC sobre este pedido puntual (desde el detalle del pedido). */
  order?: OrderForCreditNote
  /** Modo selector: el admin elige uno de estos pedidos entregados (desde el cliente). */
  deliveredOrders?: OrderForCreditNote[]
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "secondary"
}

interface ReturnLine {
  productId: string
  productName: string
  unitPrice: number
  maxQuantity: number
  include: boolean
  /** Por unidad: unidades. Por peso: PIEZAS devueltas. */
  quantity: string
  saleUnit: "unidad" | "peso"
  /** Kg entregados (tope del peso a devolver). Solo 'peso'. */
  maxWeightKg: number
  /** Kg exactos a devolver (raw string para aceptar coma). Solo 'peso'. */
  weight: string
  disposition: CreditNoteDisposition
}

interface ReplacementLine {
  key: string
  productId: string
  productName: string
  unitPrice: number
  quantity: string
}

const toNum = (v: string | number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."))
  return Number.isFinite(n) ? n : 0
}

/** Formatea kg con coma decimal (locale AR). */
const fmtKg = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 3 })

const RESOLUTION_OPTIONS: { value: CreditNoteResolution; label: string; hint: string }[] = [
  { value: "reemplazo", label: "Reemplazo de producto", hint: "Se entrega otro producto. No toca la cuenta corriente." },
  { value: "saldo_favor", label: "Saldo a favor en cuenta corriente", hint: "Acredita el monto en la cuenta (baja deuda / saldo a favor)." },
  { value: "devolucion_dinero", label: "Devolución de dinero (efectivo)", hint: "Reintegro en efectivo. Vos elegís si además impacta la cuenta corriente." },
]

const DISPOSITION_OPTIONS: { value: CreditNoteDisposition; label: string }[] = [
  { value: "reintegrar", label: "Reintegrar al stock" },
  { value: "dejar_cliente", label: "Dejar al cliente" },
  { value: "desechar", label: "Desechar" },
]

export function CreditNoteDialog({
  customerId,
  customerName,
  customer,
  products,
  order,
  deliveredOrders = [],
  triggerLabel = "Nota de crédito",
  triggerVariant = "outline",
}: CreditNoteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pedido sobre el que se basa la NC (fijo o elegido de la lista)
  const orderOptions = order ? [order] : deliveredOrders
  const [selectedOrderId, setSelectedOrderId] = useState<string>(order?.id || "")
  const selectedOrder = orderOptions.find((o) => o.id === selectedOrderId) || null

  const [resolution, setResolution] = useState<CreditNoteResolution>("reemplazo")
  const [affectsAccount, setAffectsAccount] = useState(false)
  const [reason, setReason] = useState("")
  const [authorizedBy, setAuthorizedBy] = useState("")
  const [notes, setNotes] = useState("")

  const [returnLines, setReturnLines] = useState<ReturnLine[]>([])
  const [replacementLines, setReplacementLines] = useState<ReplacementLine[]>([])

  // Al elegir/cambiar el pedido, cargar sus items como candidatos a devolución
  useEffect(() => {
    if (!selectedOrder) {
      setReturnLines([])
      return
    }
    setReturnLines(
      selectedOrder.items.map((it) => {
        const saleUnit: "unidad" | "peso" = it.saleUnit === "peso" ? "peso" : "unidad"
        const maxWeightKg = Number(it.deliveredKg) || 0
        return {
          productId: it.productId,
          productName: it.productName,
          unitPrice: it.unitPrice,
          maxQuantity: it.maxQuantity,
          include: false,
          quantity: it.maxQuantity ? String(it.maxQuantity) : "",
          saleUnit,
          maxWeightKg,
          weight: saleUnit === "peso" && maxWeightKg ? fmtKg(maxWeightKg) : "",
          disposition: "reintegrar" as CreditNoteDisposition,
        }
      }),
    )
  }, [selectedOrderId]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Monto de una línea: por peso = kg × precio/kg; por unidad = cantidad × precio. */
  const lineAmount = (l: ReturnLine) =>
    l.saleUnit === "peso" ? toNum(l.weight) * toNum(l.unitPrice) : toNum(l.quantity) * toNum(l.unitPrice)

  const amount = useMemo(
    () => returnLines.filter((l) => l.include).reduce((sum, l) => sum + lineAmount(l), 0),
    [returnLines],
  )

  const resetForm = () => {
    setSelectedOrderId(order?.id || "")
    setResolution("reemplazo")
    setAffectsAccount(false)
    setReason("")
    setAuthorizedBy("")
    setNotes("")
    setReplacementLines([])
    setError(null)
  }

  const updateReturn = (productId: string, patch: Partial<ReturnLine>) =>
    setReturnLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)))

  const addReplacementFromProduct = (productId: string) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    setReplacementLines((prev) => [
      ...prev,
      {
        key: `rep-${Date.now()}`,
        productId: p.id,
        productName: `${p.name}${p.brand ? ` ${p.brand}` : ""}`.trim(),
        unitPrice: Number(p.base_price) || 0,
        quantity: "1",
      },
    ])
  }

  const handleSubmit = async () => {
    setError(null)

    if (!selectedOrder) {
      setError("Elegí el pedido entregado sobre el que se hace la devolución")
      return
    }

    const includedLines = returnLines.filter(
      (l) => l.include && (l.saleUnit === "peso" ? toNum(l.weight) > 0 : toNum(l.quantity) > 0),
    )

    const returnedItems = includedLines.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      // por peso: quantity = PIEZAS (van al stock); por unidad: unidades
      quantity: toNum(l.quantity),
      unitPrice: toNum(l.unitPrice),
      saleUnit: l.saleUnit,
      weightKg: l.saleUnit === "peso" ? toNum(l.weight) : undefined,
      disposition: l.disposition,
    }))

    if (returnedItems.length === 0) {
      setError("Marcá al menos un producto del pedido para devolver")
      return
    }
    // Validar que no se devuelva más de lo entregado
    const overWeight = includedLines.find(
      (l) => l.saleUnit === "peso" && l.maxWeightKg > 0 && toNum(l.weight) > l.maxWeightKg,
    )
    if (overWeight) {
      setError(`No podés devolver más de ${fmtKg(overWeight.maxWeightKg)} kg de "${overWeight.productName}"`)
      return
    }
    const overMax = includedLines.find((l) => l.maxQuantity > 0 && toNum(l.quantity) > l.maxQuantity)
    if (overMax) {
      const unidad = overMax.saleUnit === "peso" ? "piezas" : "unidades"
      setError(`No podés devolver más de ${overMax.maxQuantity} ${unidad} de "${overMax.productName}"`)
      return
    }
    if (reason.trim().length < 5) {
      setError("El motivo es obligatorio (mínimo 5 caracteres)")
      return
    }

    const replacementItems =
      resolution === "reemplazo"
        ? replacementLines
            .filter((l) => toNum(l.quantity) > 0)
            .map((l) => ({
              productId: l.productId,
              productName: l.productName,
              quantity: toNum(l.quantity),
              unitPrice: toNum(l.unitPrice),
            }))
        : []

    if (resolution === "reemplazo" && replacementItems.length === 0) {
      setError("Para un reemplazo, agregá al menos un producto de reemplazo")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          orderId: selectedOrder.id,
          invoiceType: selectedOrder.invoice_type ?? null,
          resolutionType: resolution,
          affectsAccount: resolution === "devolucion_dinero" ? affectsAccount : resolution === "saldo_favor",
          reason: reason.trim(),
          authorizedBy: authorizedBy.trim() || undefined,
          notes: notes.trim() || undefined,
          returnedItems,
          replacementItems,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al emitir la nota de crédito")
        return
      }

      // Generar el PDF (mismo formato que el remito)
      const nc = data.creditNote
      try {
        await downloadCreditNote({
          ...nc,
          customer,
          order_number: selectedOrder.order_number,
          items: [
            ...returnedItems.map((it) => ({
              product_id: it.productId,
              product_name: it.productName,
              line_type: "devuelto" as const,
              quantity: it.quantity,
              unit_price: it.unitPrice,
              subtotal:
                it.saleUnit === "peso" ? (it.weightKg ?? 0) * it.unitPrice : it.quantity * it.unitPrice,
              sale_unit: it.saleUnit ?? null,
              returned_weight_kg: it.saleUnit === "peso" ? (it.weightKg ?? 0) : null,
              disposition: it.disposition,
            })),
            ...replacementItems.map((it) => ({
              product_id: it.productId,
              product_name: it.productName,
              line_type: "reemplazo" as const,
              quantity: it.quantity,
              unit_price: it.unitPrice,
              subtotal: it.quantity * it.unitPrice,
              sale_unit: null,
              returned_weight_kg: null,
              disposition: null,
            })),
          ],
        })
      } catch (pdfErr) {
        console.error("Error generando PDF de nota de crédito:", pdfErr)
      }

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err) {
      console.error("Error al emitir nota de crédito:", err)
      setError("Error al emitir la nota de crédito. Intentá nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const noOrders = orderOptions.length === 0

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" disabled={noOrders} title={noOrders ? "El cliente no tiene pedidos entregados" : undefined}>
          <FileMinus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nota de crédito · {customerName}</DialogTitle>
          <DialogDescription>
            Se basa en un pedido entregado. Elegí los productos a devolver, qué hacer con cada uno y cómo se resuelve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Pedido base */}
          <div className="space-y-2">
            <Label>Pedido entregado <span className="text-destructive">*</span></Label>
            {order ? (
              <div className="text-sm font-medium px-3 py-2 border rounded-md bg-muted/40">{order.order_number}</div>
            ) : (
              <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                <SelectTrigger><SelectValue placeholder="Elegí un pedido entregado..." /></SelectTrigger>
                <SelectContent>
                  {orderOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Resolución */}
          <div className="space-y-2">
            <Label>Resolución <span className="text-destructive">*</span></Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as CreditNoteResolution)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {RESOLUTION_OPTIONS.find((o) => o.value === resolution)?.hint}
            </p>
          </div>

          {/* Impacto en cuenta corriente (solo devolución de dinero) */}
          {resolution === "devolucion_dinero" && (
            <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg border">
              <Checkbox
                id="affects-account"
                checked={affectsAccount}
                onCheckedChange={(c) => setAffectsAccount(c as boolean)}
              />
              <Label htmlFor="affects-account" className="font-normal text-sm">
                Impactar la cuenta corriente (genera crédito). Sin tildar = reintegro solo en efectivo, no modifica el saldo.
              </Label>
            </div>
          )}

          {/* Productos del pedido a devolver */}
          <div className="space-y-2">
            <Label>Productos a devolver <span className="text-destructive">*</span></Label>
            {!selectedOrder ? (
              <p className="text-xs text-muted-foreground">Elegí primero un pedido.</p>
            ) : returnLines.length === 0 ? (
              <p className="text-xs text-muted-foreground">El pedido no tiene productos.</p>
            ) : (
              <div className="space-y-2">
                {returnLines.map((l) => {
                  const isWeight = l.saleUnit === "peso"
                  return (
                  <div key={l.productId} className="border rounded-md p-2 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1 flex justify-center">
                        <Checkbox
                          checked={l.include}
                          onCheckedChange={(c) => updateReturn(l.productId, { include: c as boolean })}
                        />
                      </div>
                      <div className="col-span-4 text-sm truncate" title={l.productName}>
                        {l.productName}
                        <span className="block text-xs text-muted-foreground">
                          {isWeight
                            ? `$${l.unitPrice.toFixed(2)}/kg · entregado: ${l.maxQuantity} pza`
                            : `$${l.unitPrice.toFixed(2)} · pedido: ${l.maxQuantity}`}
                        </span>
                      </div>
                      <Input
                        className="col-span-2 h-8"
                        type="text"
                        inputMode="decimal"
                        placeholder={isWeight ? "Piezas" : "Cant."}
                        value={l.quantity}
                        disabled={!l.include}
                        onChange={(e) => updateReturn(l.productId, { quantity: e.target.value })}
                      />
                      <div className="col-span-5">
                        <Select
                          value={l.disposition}
                          onValueChange={(v) => updateReturn(l.productId, { disposition: v as CreditNoteDisposition })}
                          disabled={!l.include}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DISPOSITION_OPTIONS.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Productos por peso: kg exactos a devolver (definen el monto) */}
                    {isWeight && l.include && (
                      <div className="grid grid-cols-12 gap-2 items-center pl-8">
                        <Label className="col-span-3 text-xs text-muted-foreground">Kg a devolver</Label>
                        <Input
                          className="col-span-3 h-8"
                          type="text"
                          inputMode="decimal"
                          placeholder="Kg"
                          value={l.weight}
                          onChange={(e) => updateReturn(l.productId, { weight: e.target.value })}
                        />
                        <span className="col-span-6 text-xs text-muted-foreground">
                          {l.maxWeightKg > 0 && `de ${fmtKg(l.maxWeightKg)} kg · `}
                          acredita <strong>${lineAmount(l).toFixed(2)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Total a acreditar: <strong>${amount.toFixed(2)}</strong>
            </p>
          </div>

          {/* Productos de reemplazo (solo reemplazo) */}
          {resolution === "reemplazo" && (
            <div className="space-y-2">
              <Label>Productos de reemplazo entregados</Label>
              <div className="space-y-2">
                {replacementLines.map((l) => (
                  <div key={l.key} className="grid grid-cols-12 gap-2 items-center border rounded-md p-2">
                    <div className="col-span-6 text-sm truncate" title={l.productName}>{l.productName}</div>
                    <Input
                      className="col-span-2 h-8"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Cant."
                      value={l.quantity}
                      onChange={(e) =>
                        setReplacementLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, quantity: e.target.value } : x)))
                      }
                    />
                    <Input
                      className="col-span-3 h-8"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="P.Unit"
                      value={l.unitPrice}
                      onChange={(e) =>
                        setReplacementLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, unitPrice: toNum(e.target.value) } : x)))
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1 h-8 w-8 text-red-500"
                      onClick={() => setReplacementLines((prev) => prev.filter((x) => x.key !== l.key))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Select value="" onValueChange={addReplacementFromProduct}>
                <SelectTrigger className="h-8">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Plus className="h-3 w-3" /> Agregar producto de reemplazo
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.brand ? ` · ${p.brand}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Se descuenta el stock de los productos de reemplazo.</p>
            </div>
          )}

          {/* Motivo + autorización + notas */}
          <div className="space-y-2">
            <Label htmlFor="cn-reason">Motivo <span className="text-destructive">*</span></Label>
            <Textarea
              id="cn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Falla de producto (según política de devoluciones)"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cn-auth">Autorizado por</Label>
              <Input
                id="cn-auth"
                value={authorizedBy}
                onChange={(e) => setAuthorizedBy(e.target.value)}
                placeholder="Quién autorizó"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cn-notes">Notas</Label>
              <Input
                id="cn-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Emitiendo...</>
            ) : (
              <><FileMinus className="mr-2 h-4 w-4" />Emitir nota de crédito</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
