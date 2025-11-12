"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Package } from "lucide-react"

interface OrderCardProps {
  order: any
  isSelected: boolean
  onToggle: (orderId: string) => void
}

/**
 * OrderCard - Componente de tarjeta para mostrar un pedido individual
 * Muestra información clave del pedido de forma visual y compacta
 */
export function OrderCard({ order, isSelected, onToggle }: OrderCardProps) {
  const customerName = order.customers?.commercial_name || order.customers?.name || "Cliente"
  const orderNumber = order.order_number || "S/N"
  const itemsCount = order.order_items?.length || 0
  
  // Address components
  const street = order.customers?.street || ""
  const streetNumber = order.customers?.street_number || ""
  const floorApt = order.customers?.floor_apt || ""
  const locality = order.customers?.locality || ""
  
  // Customer info
  const customerType = order.customers?.customer_type
  const priority = order.priority

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return 'destructive'
      case 'alta':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const handleCardClick = () => {
    onToggle(order.id)
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? "border-2 border-primary bg-primary/5 shadow-sm"
          : "border hover:border-primary/50"
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`order-${order.id}`}
            checked={isSelected}
            onCheckedChange={() => onToggle(order.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight truncate" title={customerName}>
              {customerName}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              #{orderNumber}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-2">
        {/* Address */}
        <div className="flex items-start gap-2 text-xs">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-muted-foreground line-clamp-2">
            {street} {streetNumber}
            {floorApt && `, ${floorApt}`}
            <br />
            {locality}
          </p>
        </div>

        {/* Order Details */}
        <div className="flex items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          {priority && priority !== 'normal' && (
            <Badge variant={getPriorityBadgeVariant(priority)} className="text-xs capitalize">
              {priority}
            </Badge>
          )}
        </div>

        {/* Customer Type */}
        {customerType && (
          <div className="pt-1">
            <Badge variant="outline" className="text-xs">
              {customerType === 'mayorista' ? 'Mayorista' : 'Minorista'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

