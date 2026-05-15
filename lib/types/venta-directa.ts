// Tipos del dominio de venta directa.
// Mantenemos esto separado de database.ts para no engordar ese archivo
// y porque son tipos de aplicación, no del schema crudo.

import type { Order, Customer, OrderItem, Product, PaymentMethod, PaymentLine } from "./database"

// Venta directa = una orden ENTREGADA con order_type='local' creada por rol venta_directa.
// Es Order extendida con relaciones útiles para listados/detalle.
export interface DirectSale extends Order {
  customer?: Pick<Customer, "id" | "code" | "commercial_name" | "contact_name" | "phone">
  items?: DirectSaleItem[]
  seller_name?: string
}

export interface DirectSaleItem extends OrderItem {
  product?: Pick<Product, "id" | "code" | "name" | "unit_of_measure" | "allows_decimal_quantity">
}

// KPIs para el dashboard del rol y para reportes admin de canales
export interface DirectSaleKPIs {
  totalSales: number          // cantidad de ventas
  totalRevenue: number        // suma de totales
  averageTicket: number       // ticket promedio
  totalItems: number          // items vendidos
  paymentBreakdown: Array<{ method: PaymentMethod; amount: number; count: number }>
  accountReceivable: number   // monto a cta cte (deuda generada)
}

// Comparativa entre canales (preventista vs venta_directa)
export interface ChannelComparison {
  preventista: DirectSaleKPIs
  ventaDirecta: DirectSaleKPIs
  series: Array<{ date: string; preventista: number; ventaDirecta: number }>
}

// Línea del carrito en el form (vive solo en cliente, no se persiste tal cual)
export interface CartLine {
  productId: string
  productName: string
  productCode: string
  unitOfMeasure: string
  saleUnit: "unidad" | "peso"
  allowsDecimal: boolean
  quantity: number
  unitPrice: number
  discount: number
  discountType: "fixed" | "percentage"
  subtotal: number
}

export interface CartTotals {
  subtotal: number
  generalDiscountAmount: number
  total: number
}

// Línea de pago en el form (alias del PaymentLine de DB sin ambigüedad)
export type CartPaymentLine = PaymentLine
