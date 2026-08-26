// Construcción de una "plantilla" de pedido a partir de un pedido ya existente.
//
// Se usa para el flujo "basar un pedido nuevo en uno anterior": se copian las
// líneas del pedido origen, pero re-precificadas con la lista vigente (los
// precios se mueven todo el tiempo, repetir un pedido viejo con precios viejos
// sería vender a pérdida) y descartando productos que ya no están disponibles.
//
// Función pura: sin Supabase, sin DOM. Se llama desde el server component que
// arma el `initialOrderData` del form.

import type { Customer, Product } from "@/lib/types/database"
import { toNum } from "@/lib/utils/cart-calculations"

/** Línea tal como la consume `NewOrderForm`. */
export interface TemplateOrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  subtotal: number
  unitOfMeasure?: string
  saleUnit?: "unidad" | "peso"
}

/** Item del pedido origen, tal como viene de Supabase (DECIMAL → string). */
interface SourceOrderItem {
  product_id: string
  quantity_requested: number | string
  unit_price: number | string
  discount: number | string
  subtotal: number | string
  sale_unit?: "unidad" | "peso" | null
}

export interface OrderTemplate {
  items: TemplateOrderItem[]
  /** Avisos para mostrarle al preventista antes de que confirme. */
  warnings: string[]
}

/**
 * Precio vigente del producto según el tipo de cliente.
 * Misma lógica que usa el form al agregar un producto a mano.
 */
export function resolveCurrentPrice(product: Product, customerType?: Customer["customer_type"]): number {
  if (customerType === "mayorista" && product.wholesale_price) return toNum(product.wholesale_price)
  if (customerType === "minorista" && product.retail_price) return toNum(product.retail_price)
  return toNum(product.base_price)
}

const formatMoney = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatQty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3))

/**
 * Arma las líneas de un pedido nuevo a partir de las de uno existente.
 *
 * - Descarta productos inactivos o inexistentes (no vienen en `products`).
 * - Re-precifica con la lista vigente según el tipo de cliente.
 * - Conserva el descuento como *porcentaje efectivo* de la línea original
 *   (en la BD sólo se guarda el monto, se perdió si se cargó como $ o %),
 *   capeándolo contra los límites configurados en el producto.
 */
export function buildOrderTemplate(
  sourceItems: SourceOrderItem[],
  products: Product[],
  customer: Customer | null,
): OrderTemplate {
  const warnings: string[] = []
  const items: TemplateOrderItem[] = []

  const byId = new Map(products.map((p) => [p.id, p]))
  let repricedCount = 0

  for (const source of sourceItems) {
    const product = byId.get(source.product_id)

    if (!product) {
      warnings.push("Se descartó un producto que ya no está disponible en el catálogo.")
      continue
    }

    const quantity = toNum(source.quantity_requested)
    if (quantity <= 0) continue

    const previousPrice = toNum(source.unit_price)
    const unitPrice = resolveCurrentPrice(product, customer?.customer_type)
    const label = `${product.name}${product.brand ? ` - ${product.brand}` : ""}`

    // Pieza pesada: se pide en piezas y se factura por kg de balanza, así que el
    // total de la línea es estimado (piezas × peso estimado × precio/kg).
    const isPesoProduct = product.sale_unit === "peso"
    const estimatedWeightKg = isPesoProduct ? toNum(product.estimated_weight_kg) : 0
    const lineTotal = isPesoProduct ? quantity * estimatedWeightKg * unitPrice : quantity * unitPrice

    // El descuento original está guardado en pesos sobre el total viejo de la
    // línea. Lo trasladamos como porcentaje para que acompañe el precio nuevo.
    const previousLineTotal = isPesoProduct
      ? quantity * estimatedWeightKg * previousPrice
      : quantity * previousPrice
    const previousDiscount = toNum(source.discount)
    let discountPct = previousLineTotal > 0 ? (previousDiscount / previousLineTotal) * 100 : 0
    discountPct = Math.min(Math.max(discountPct, 0), 100)

    if (discountPct > 0 && product.max_discount_percentage != null && discountPct > product.max_discount_percentage) {
      warnings.push(
        `${label}: el descuento se ajustó de ${discountPct.toFixed(1)}% a ${product.max_discount_percentage}% (máximo permitido).`,
      )
      discountPct = product.max_discount_percentage
    }

    let discount = (lineTotal * discountPct) / 100

    if (discount > 0 && product.max_discount_fixed != null && discount > product.max_discount_fixed) {
      warnings.push(
        `${label}: el descuento se ajustó a $${formatMoney(product.max_discount_fixed)} (máximo permitido).`,
      )
      discount = product.max_discount_fixed
    }

    if (previousPrice > 0 && Math.abs(unitPrice - previousPrice) > 0.009) {
      repricedCount++
      const direction = unitPrice > previousPrice ? "subió" : "bajó"
      warnings.push(
        `${label}: el precio ${direction} de $${formatMoney(previousPrice)} a $${formatMoney(unitPrice)}.`,
      )
    }

    if (isPesoProduct && estimatedWeightKg <= 0) {
      warnings.push(`${label}: no tiene peso estimado por pieza cargado, el total de la línea queda en $0.`)
    }

    if (toNum(product.current_stock) === 0) {
      warnings.push(`${label}: sin stock disponible, el pedido puede salir con faltantes.`)
    } else if (toNum(product.current_stock) < quantity) {
      warnings.push(
        `${label}: stock actual ${formatQty(toNum(product.current_stock))} y estás pidiendo ${formatQty(quantity)}.`,
      )
    }

    items.push({
      productId: product.id,
      productName: label,
      quantity,
      unitPrice,
      discount,
      subtotal: Math.max(0, lineTotal - discount),
      unitOfMeasure: product.unit_of_measure || "unidad",
      saleUnit: isPesoProduct ? "peso" : source.sale_unit === "peso" ? "peso" : "unidad",
    })
  }

  if (repricedCount > 0) {
    warnings.unshift(
      repricedCount === 1
        ? "1 precio se actualizó respecto del pedido original."
        : `${repricedCount} precios se actualizaron respecto del pedido original.`,
    )
  }

  if (items.length === 0) {
    warnings.push("Ninguna línea del pedido original pudo copiarse. Cargá los productos a mano.")
  }

  return { items, warnings }
}
