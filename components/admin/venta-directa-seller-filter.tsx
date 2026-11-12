"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User } from "lucide-react"

interface Seller {
  id: string
  full_name: string
}

interface Props {
  sellers: Seller[]
  value?: string
}

export function VentaDirectaSellerFilter({ sellers, value }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (sellerId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (sellerId === "all") params.delete("seller")
    else params.set("seller", sellerId)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={value || "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-[220px]">
        <User className="h-4 w-4 mr-1 text-muted-foreground" />
        <SelectValue placeholder="Todos los vendedores" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los vendedores</SelectItem>
        {sellers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
