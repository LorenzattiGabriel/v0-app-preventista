"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Merge, Users } from "lucide-react"
import { MergeOrdersDialog } from "./merge-orders-dialog"
import type { MergeableGroup } from "@/lib/utils/mergeable-orders"
import { useRouter } from "next/navigation"

interface MergeableOrdersBannerProps {
  groups: MergeableGroup[]
}

export function MergeableOrdersBanner({ groups }: MergeableOrdersBannerProps) {
  const [selectedGroup, setSelectedGroup] = useState<MergeableGroup | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  if (groups.length === 0) return null

  const handleOpenMerge = (group: MergeableGroup) => {
    setSelectedGroup(group)
    setDialogOpen(true)
  }

  const handleSuccess = () => {
    setDialogOpen(false)
    setSelectedGroup(null)
    router.refresh()
  }

  return (
    <>
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
        <Users className="h-4 w-4 text-amber-600" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {groups.length === 1
                ? "1 cliente tiene pedidos que se pueden fusionar"
                : `${groups.length} clientes tienen pedidos que se pueden fusionar`}
            </p>
            <div className="space-y-1.5">
              {groups.map((group) => (
                <div
                  key={group.customer_id}
                  className="flex items-center justify-between gap-2 bg-white/60 dark:bg-black/20 rounded px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-medium">{group.customer_name}</span>
                    {group.customer_locality && (
                      <span className="text-muted-foreground ml-1">
                        ({group.customer_locality})
                      </span>
                    )}
                    <span className="text-muted-foreground ml-2">
                      — {group.orders.length} pedidos · $
                      {group.orders
                        .reduce((sum, o) => sum + o.total, 0)
                        .toLocaleString("es-AR")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950"
                    onClick={() => handleOpenMerge(group)}
                  >
                    <Merge className="h-3.5 w-3.5 mr-1.5" />
                    Fusionar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {selectedGroup && (
        <MergeOrdersDialog
          group={selectedGroup}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
