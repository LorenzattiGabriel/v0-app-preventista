"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
} from "@/components/ui/alert-dialog"
import { Users, MoreVertical, Pencil, UserX, UserCheck, Shield, Truck, Package, User, Trash2 } from "lucide-react"
import {
  ROLE_LABELS,
  ROLE_COLORS,
  type UserRole,
} from "@/lib/constants/user-roles"
import { toast } from "sonner"

interface UserData {
  id: string
  email: string
  full_name: string
  role: string
  phone: string | null
  is_active: boolean
  created_at: string
}

interface UsersListProps {
  users: UserData[]
}

/**
 * Users List Component
 * Displays a list of users with their details and management actions
 */
export function UsersList({ users }: UsersListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    userId: string
    action: "activate" | "deactivate" | "delete"
    userName: string
  }>({ open: false, userId: "", action: "deactivate", userName: "" })

  const handleToggleStatus = async (userId: string, currentStatus: boolean, userName: string) => {
    // Show confirmation dialog for deactivation
    if (currentStatus) {
      setConfirmDialog({
        open: true,
        userId,
        action: "deactivate",
        userName,
      })
      return
    }

    // Direct activation
    await executeToggle(userId, true)
  }

  const executeToggle = async (userId: string, newStatus: boolean) => {
    setLoadingId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cambiar estado")
      }

      toast.success(data.message)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado del usuario")
    } finally {
      setLoadingId(null)
      setConfirmDialog({ open: false, userId: "", action: "deactivate", userName: "" })
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    setConfirmDialog({
      open: true,
      userId,
      action: "delete",
      userName,
    })
  }

  const executeDelete = async (userId: string) => {
    setLoadingId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar usuario")
      }

      toast.success(data.message)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el usuario")
    } finally {
      setLoadingId(null)
      setConfirmDialog({ open: false, userId: "", action: "deactivate", userName: "" })
    }
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          No se encontraron usuarios
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Intenta cambiar los filtros de búsqueda
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            isLoading={loadingId === u.id}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteUser}
          />
        ))}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "delete" ? "¿Eliminar usuario permanentemente?" : "¿Desactivar usuario?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "delete" ? (
                <>
                  Estás a punto de eliminar permanentemente a <strong>{confirmDialog.userName}</strong>. 
                  Esta acción no se puede deshacer y el usuario será eliminado de la base de datos.
                </>
              ) : (
                <>
                  Estás a punto de desactivar a <strong>{confirmDialog.userName}</strong>. 
                  El usuario no podrá iniciar sesión hasta que sea reactivado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.action === "delete") {
                  executeDelete(confirmDialog.userId)
                } else {
                  executeToggle(confirmDialog.userId, false)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmDialog.action === "delete" ? "Eliminar Permanentemente" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Role Icon Component
 */
function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case "administrativo":
      return <Shield className="h-4 w-4" />
    case "repartidor":
      return <Truck className="h-4 w-4" />
    case "encargado_armado":
      return <Package className="h-4 w-4" />
    case "preventista":
      return <User className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
  }
}

/**
 * User Card Component
 * Individual user card display with actions
 */
function UserCard({
  user,
  isLoading,
  onToggleStatus,
  onDelete,
}: {
  user: UserData
  isLoading: boolean
  onToggleStatus: (userId: string, currentStatus: boolean, userName: string) => void
  onDelete: (userId: string, userName: string) => void
}) {
  const router = useRouter()

  return (
    <div className={`flex items-start justify-between p-4 border rounded-lg transition-colors ${
      user.is_active ? "hover:bg-muted/50" : "bg-muted/30 opacity-75"
    }`}>
      <div className="flex items-center gap-4 flex-1">
        {/* Avatar */}
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
          user.is_active ? "bg-primary/10" : "bg-muted"
        }`}>
          <RoleIcon role={user.role} />
        </div>

        {/* User Info */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-lg truncate ${!user.is_active && "text-muted-foreground"}`}>
              {user.full_name}
            </span>

            <Badge variant={ROLE_COLORS[user.role as UserRole]}>
              {ROLE_LABELS[user.role as UserRole]}
            </Badge>

            <Badge variant={user.is_active ? "default" : "secondary"} className={
              user.is_active ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-500"
            }>
              {user.is_active ? "✓ Activo" : "Inactivo"}
            </Badge>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground truncate">
              <span className="font-medium">Email:</span> {user.email}
            </p>

            {user.phone && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Teléfono:</span> {user.phone}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Creado: {formatDate(user.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user.is_active ? "Activo" : "Inactivo"}
          </span>
          <Switch
            checked={user.is_active}
            onCheckedChange={() => onToggleStatus(user.id, user.is_active, user.full_name)}
            disabled={isLoading}
            aria-label={user.is_active ? "Desactivar usuario" : "Activar usuario"}
          />
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isLoading}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}/edit`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Usuario
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.is_active ? (
              <DropdownMenuItem
                onClick={() => onToggleStatus(user.id, user.is_active, user.full_name)}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Desactivar
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onToggleStatus(user.id, user.is_active, user.full_name)}
                className="text-green-600 focus:text-green-600"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Activar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(user.id, user.full_name)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar Permanentemente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/**
 * Format date to local string
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
