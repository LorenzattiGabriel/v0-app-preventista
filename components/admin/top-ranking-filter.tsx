"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trophy } from "lucide-react"
import { TOP_N_OPTIONS } from "@/lib/services/customerStatsService"

interface TopRankingFilterProps {
  value: number
}

/**
 * Cuántos clientes muestra cada ranking. Aplica a los cuatro a la vez.
 *
 * No toca el parámetro `page`: ése pagina la tabla de clientes inactivos, que
 * es independiente de los rankings.
 */
export function TopRankingFilter({ value }: TopRankingFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const apply = (top: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("top", String(top))
    startTransition(() => router.push(`?${params.toString()}`))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5" />
        Mostrar por ranking
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {TOP_N_OPTIONS.map((n) => (
          <Button
            key={n}
            type="button"
            variant={n === value ? "default" : "outline"}
            size="sm"
            onClick={() => apply(n)}
            disabled={isPending || n === value}
          >
            Top {n}
          </Button>
        ))}
      </div>
    </div>
  )
}
