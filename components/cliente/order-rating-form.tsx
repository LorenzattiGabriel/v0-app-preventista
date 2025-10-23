"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star } from "lucide-react"

interface OrderRatingFormProps {
  orderId: string
  customerId: string
}

export function OrderRatingForm({ orderId, customerId }: OrderRatingFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comments, setComments] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rating === 0) {
      setError("Por favor selecciona una calificación")
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
      })

      if (ratingError) throw ratingError

      router.refresh()
    } catch (err) {
      console.error("[v0] Error submitting rating:", err)
      setError(err instanceof Error ? err.message : "Error al enviar la calificación")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Calificación</Label>
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
        <Label htmlFor="comments">Comentarios (opcional)</Label>
        <Textarea
          id="comments"
          placeholder="Cuéntanos sobre tu experiencia..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isLoading || rating === 0}>
        {isLoading ? "Enviando..." : "Enviar Calificación"}
      </Button>
    </form>
  )
}
