"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"
import { BulkPriceUpdateDialog } from "./bulk-price-update-dialog"
import { useRouter } from "next/navigation"

export function BulkPriceUpdateButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <TrendingUp className="mr-2 h-4 w-4" />
        Precios por Marca
      </Button>
      <BulkPriceUpdateDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}
