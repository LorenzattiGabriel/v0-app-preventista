import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, FileText } from 'lucide-react'
import { MarkInvoicedButton } from './mark-invoiced-button'
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type OrderStatus,
  type OrderPriority,
} from '@/lib/constants/order-status'

interface Order {
  id: string
  order_number: string
  status: string
  priority: string
  has_shortages: boolean
  order_date: string
  delivery_date: string
  total: number
  requires_invoice?: boolean
  invoice_type?: string | null
  is_invoiced?: boolean
  invoice_number?: string | null
  invoice_file_url?: string | null
  customers: {
    commercial_name: string
    locality: string
  } | null
  profiles: {
    full_name: string
  } | null
}

interface OrdersListProps {
  orders: Order[]
}

/**
 * Orders List Component
 * Displays a list of orders with their details
 */
export function OrdersList({ orders }: OrdersListProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No se encontraron pedidos
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Intenta cambiar los filtros de búsqueda
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}

/**
 * Order Card Component
 * Individual order card display
 */
function OrderCard({ order }: { order: Order }) {
  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-lg">{order.order_number}</span>
          
          <Badge variant={STATUS_COLORS[order.status as OrderStatus]}>
            {STATUS_LABELS[order.status as OrderStatus]}
          </Badge>
          
          <Badge variant={PRIORITY_COLORS[order.priority as OrderPriority]}>
            {PRIORITY_LABELS[order.priority as OrderPriority]}
          </Badge>
          
          {order.has_shortages && (
            <Badge
              variant="outline"
              className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
            >
              Con Faltantes
            </Badge>
          )}

          {order.requires_invoice && order.is_invoiced && (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
            >
              Facturada{order.invoice_number ? ` · ${order.invoice_number}` : ''}
            </Badge>
          )}

          {order.requires_invoice && !order.is_invoiced && (
            <Badge
              variant="outline"
              className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800"
            >
              Pendiente factura{order.invoice_type ? ` ${order.invoice_type}` : ''}
            </Badge>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Cliente:{' '}
            <span className="text-foreground">
              {order.customers?.commercial_name || 'N/A'}
            </span>
          </p>
          
          <p className="text-sm text-muted-foreground">
            Ubicación: {order.customers?.locality || 'N/A'}
          </p>
          
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              Pedido: {formatDate(order.order_date)}
            </span>
            <span>
              Entrega: {formatDate(order.delivery_date)}
            </span>
            <span className="font-medium">
              Total: ${formatCurrency(order.total)}
            </span>
          </div>
          
          {order.profiles && (
            <p className="text-xs text-muted-foreground">
              Creado por: {order.profiles.full_name}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 items-end shrink-0">
        <Button asChild variant="outline">
          <Link href={`/admin/orders/${order.id}`}>Ver Detalles</Link>
        </Button>

        {order.requires_invoice && !order.is_invoiced && (
          <MarkInvoicedButton
            orderId={order.id}
            orderNumber={order.order_number}
            invoiceType={order.invoice_type}
          />
        )}

        {order.is_invoiced && order.invoice_file_url && (
          <Button asChild variant="ghost" size="sm">
            <a
              href={order.invoice_file_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText className="mr-2 h-4 w-4" />
              Ver factura
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Format date to local string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR')
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}


