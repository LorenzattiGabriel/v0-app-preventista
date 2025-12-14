"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Package, Calendar, Clock } from "lucide-react"

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
  const deliveryDate = order.delivery_date
  
  // Address components
  const street = order.customers?.street || ""
  const streetNumber = order.customers?.street_number || ""
  const floorApt = order.customers?.floor_apt || ""
  const locality = order.customers?.locality || ""
  
  // Customer info
  const customerType = order.customers?.customer_type
  const priority = order.priority

  // 🆕 Time window restriction
  const hasTimeRestriction = order.has_time_restriction
  const deliveryWindowStart = order.delivery_window_start
  const deliveryWindowEnd = order.delivery_window_end
  const timeRestrictionNotes = order.time_restriction_notes

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

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}`
  }

  const getDaysOverdue = (dateString: string) => {
    if (!dateString) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const delivery = new Date(dateString)
    const diffTime = today.getTime() - delivery.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getRelativeDateLabel = (dateString: string) => {
    if (!dateString) return "Sin fecha"
    const days = getDaysOverdue(dateString)
    if (days < 0) return formatDate(dateString) // Future
    if (days === 0) return "Para hoy"
    if (days === 1) return "Ayer"
    return `Hace ${days} días`
  }

  const getUrgencyColorClass = (days: number) => {
    if (days <= 0) return "bg-blue-500" // Normal/Future
    if (days <= 2) return "bg-yellow-500" // Low
    if (days <= 5) return "bg-orange-500" // Medium
    return "bg-red-600" // High
  }

  const getUrgencyBorderClass = (days: number) => {
    if (days <= 0) return "border-l-blue-500"
    if (days <= 2) return "border-l-yellow-500"
    if (days <= 5) return "border-l-orange-500"
    return "border-l-red-600"
  }

  const daysOverdue = getDaysOverdue(deliveryDate)

  return (
    <Card
      className={`group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg border-l-[6px] ${
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : `${getUrgencyBorderClass(daysOverdue)} hover:bg-muted/50`
      }`}
      onClick={handleCardClick}
    >
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          id={`order-${order.id}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(order.id)}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      <CardContent className="p-3 pl-9 space-y-3">
        {/* Header: Name & Date Badge */}
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm leading-tight text-foreground truncate" title={customerName}>
              {customerName}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
               <span className="font-mono bg-muted px-1 rounded text-[10px]">#{orderNumber}</span>
               <span className="truncate">{locality}</span>
            </div>
          </div>
          
          <div className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm ${getUrgencyColorClass(daysOverdue)}`}>
            {getRelativeDateLabel(deliveryDate)}
          </div>
        </div>

        {/* Address */}
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
           <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
           <p className="line-clamp-2 leading-relaxed">
             {street} {streetNumber}
             {floorApt && <span className="text-foreground/80 font-medium"> • {floorApt}</span>}
           </p>
        </div>

        {/* Footer: Details & Price */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {/* Priority Badge */}
            {priority && priority !== 'normal' && (
              <Badge variant={getPriorityBadgeVariant(priority)} className="text-[10px] px-1.5 h-5 shadow-none border-0 font-semibold uppercase tracking-wider">
                {priority}
              </Badge>
            )}
            
            <div className="flex items-center text-xs text-muted-foreground" title="Cantidad de items">
              <Package className="h-3.5 w-3.5 mr-1" />
              <span>{itemsCount}</span>
            </div>
          </div>

        {/* Customer Type & Time Restriction */}
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {customerType && (
            <Badge variant="outline" className="text-xs">
              {customerType === 'mayorista' ? 'Mayorista' : 'Minorista'}
            </Badge>
          )}

          {/* 🆕 Time Window Badge */}
          {hasTimeRestriction && (
            <Badge 
              variant="secondary" 
              className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-300"
              title={timeRestrictionNotes || `${deliveryWindowStart} - ${deliveryWindowEnd}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              {deliveryWindowStart?.slice(0, 5)} - {deliveryWindowEnd?.slice(0, 5)}
            </Badge>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-foreground">
            ${order.total?.toLocaleString('es-AR') || '0'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

