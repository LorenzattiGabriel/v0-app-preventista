"use client"

import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, FileText, Trash2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useOrderFormActions } from "./use-order-form-actions"
import { createClient } from "@/lib/supabase/client"

interface DraftActionsProps {
  orderId: string
}

export function DraftActions({ orderId }: DraftActionsProps) {
  const { isLoading, deleteOrder: deleteDraft, duplicateDraft, confirmOrder, isDeleting, isDuplicating, isConfirming } = useOrderFormActions()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    fetchUserId()
  }, [])

  const handleDelete = async () => {
    await deleteDraft(orderId)
  }

  const handleDuplicate = async () => {
    await duplicateDraft(orderId)
  }

  const handleConfirm = async () => {
    if (userId) {
      await confirmOrder(orderId, userId)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isLoading}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* 🆕 CRITICAL-3a: Confirm Order Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-green-600 focus:bg-green-50 focus:text-green-600" disabled={isConfirming || isDuplicating || isDeleting}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {isConfirming ? "Confirmando..." : "Confirmar Pedido"}
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Confirmar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                El pedido pasará de BORRADOR a PENDIENTE_ARMADO y estará listo para ser armado. Ya no podrás editar el pedido después de confirmarlo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild disabled={isDuplicating || isDeleting || isConfirming}>
          <Link href={`/preventista/orders/drafts/${orderId}`} className="flex items-center"><Edit className="mr-2 h-4 w-4" />Editar</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={handleDuplicate} disabled={isDuplicating || isDeleting || isConfirming}>
          <FileText className="mr-2 h-4 w-4" />{isDuplicating ? "Duplicando..." : "Duplicar"}
        </DropdownMenuItem>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive" disabled={isDeleting || isDuplicating || isConfirming}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Esto eliminará permanentemente el borrador del pedido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
