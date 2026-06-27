"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"

interface InactiveThresholdFilterProps {
  defaultValue: number
}

const PRESETS = [10, 15, 30, 45, 60]

export function InactiveThresholdFilter({ defaultValue }: InactiveThresholdFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(String(defaultValue))
  const [isPending, startTransition] = useTransition()

  const apply = (days: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("inactiveDays", String(days))
    params.delete("page")
    startTransition(() => router.push(`?${params.toString()}`))
  }

  const handleApply = () => {
    const n = parseInt(value)
    if (Number.isFinite(n) && n > 0) apply(n)
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Umbral de inactividad (días sin pedir)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="w-24"
          />
          <Button onClick={handleApply} disabled={isPending} size="sm">
            Aplicar
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p}
            type="button"
            variant={String(p) === value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setValue(String(p))
              apply(p)
            }}
            disabled={isPending}
          >
            {p}d
          </Button>
        ))}
      </div>
    </div>
  )
}
