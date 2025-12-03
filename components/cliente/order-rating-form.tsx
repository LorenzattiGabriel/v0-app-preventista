"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star } from "lucide-react"
import { Separator } from "@/components/ui/separator"

interface OrderRatingFormProps {
  orderId: string
  customerId: string
}

export function OrderRatingForm({ orderId, customerId }: OrderRatingFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comments, setComments] = useState("")
  const [driverRating, setDriverRating] = useState(0)
  const [hoveredDriverRating, setHoveredDriverRating] = useState(0)
  const [driverComments, setDriverComments] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0 || driverRating === 0) {
      setError("Por favor selecciona ambas calificaciones (pedido y repartidor)")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: ratingError } = await supabase.from("order_ratings").insert({
        order_id: orderId,
        customer_id: customerId,
        rating,
        comments: comments || null,
        driver_rating: driverRating,
        driver_comments: driverComments || null,
      })

      if (ratingError) throw ratingError

      router.refresh()
    } catch (err) {
      console.error("Error submitting rating:", err)
      setError(err instanceof Error ? err.message : "Error al enviar la calificación")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      {/* Order/Products Rating */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">Califica tu pedido</h3>
          <p className="text-sm text-muted-foreground">¿Cómo fue la calidad de los productos?</p>
        </div>
        
        <div className="space-y-2">
          <Label>Calificación del Pedido</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating) ? "fill-yellow-500 text-yellow-500" : "fill-none text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-muted-foreground">
              {rating === 1 && "Muy insatisfecho"}
              {rating === 2 && "Insatisfecho"}
              {rating === 3 && "Neutral"}
              {rating === 4 && "Satisfecho"}
              {rating === 5 && "Muy satisfecho"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="comments">Comentarios sobre el pedido (opcional)</Label>
          <Textarea
            id="comments"
            placeholder="Cuéntanos sobre la calidad de los productos..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Driver Rating */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">Califica al repartidor</h3>
          <p className="text-sm text-muted-foreground">¿Cómo fue el servicio de entrega?</p>
        </div>
        
        <div className="space-y-2">
          <Label>Calificación del Repartidor</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setDriverRating(star)}
                onMouseEnter={() => setHoveredDriverRating(star)}
                onMouseLeave={() => setHoveredDriverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredDriverRating || driverRating) ? "fill-blue-500 text-blue-500" : "fill-none text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {driverRating > 0 && (
            <p className="text-sm text-muted-foreground">
              {driverRating === 1 && "Muy insatisfecho"}
              {driverRating === 2 && "Insatisfecho"}
              {driverRating === 3 && "Neutral"}
              {driverRating === 4 && "Satisfecho"}
              {driverRating === 5 && "Muy satisfecho"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="driverComments">Comentarios sobre el repartidor (opcional)</Label>
          <Textarea
            id="driverComments"
            placeholder="Cuéntanos sobre el servicio de entrega..."
            value={driverComments}
            onChange={(e) => setDriverComments(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <Button type="submit" disabled={isLoading || rating === 0 || driverRating === 0} className="w-full">
        {isLoading ? "Enviando..." : "Enviar Calificaciones"}
      </Button>
    </form>
  )
}
