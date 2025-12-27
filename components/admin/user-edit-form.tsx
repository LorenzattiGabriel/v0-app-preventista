"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, AlertTriangle, Shield, Truck, Package, User } from "lucide-react"
import { toast } from "sonner"
import { ROLE_LABELS, USER_ROLES_LIST, type UserRole } from "@/lib/constants/user-roles"

interface UserEditFormProps {
  user: {
    id: string
    email: string
    full_name: string
    role: string
    phone: string | null
    is_active: boolean
    created_at: string
    updated_at: string
  }
  isSelf: boolean
}

export function UserEditForm({ user, isSelf }: UserEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fullName, setFullName] = useState(user.full_name)
  const [phone, setPhone] = useState(user.phone || "")
  const [role, setRole] = useState<string>(user.role)
  const [isActive, setIsActive] = useState(user.is_active)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (fullName.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
          is_active: isActive,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar usuario")
      }

      toast.success("Usuario actualizado correctamente")
      router.push("/admin/users")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al actualizar usuario")
      toast.error(err.message || "Error al actualizar usuario")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Información del Usuario</CardTitle>
              <CardDescription>
                Edita los datos del usuario. El email no puede ser modificado.
              </CardDescription>
            </div>
            <Badge variant={user.is_active ? "default" : "secondary"}>
              {user.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              El email no puede ser modificado
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 351 1234567"
            />
            <p className="text-xs text-muted-foreground">
              Número de contacto del usuario (opcional)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role & Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Rol y Estado</CardTitle>
          <CardDescription>
            Configura el rol y estado de activación del usuario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Role */}
          <div className="space-y-2">
            <Label>Rol del Usuario</Label>
            <Select
              value={role}
              onValueChange={setRole}
              disabled={isSelf}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES_LIST.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(r)}
                      {ROLE_LABELS[r]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No puedes cambiar tu propio rol
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Usuario Activo</Label>
              <p className="text-sm text-muted-foreground">
                Los usuarios inactivos no pueden iniciar sesión
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSelf}
            />
          </div>

          {isSelf && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No puedes desactivar tu propia cuenta ni cambiar tu rol por seguridad.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permisos por Rol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium">Administrativo</p>
                <p className="text-muted-foreground">
                  Acceso completo: gestión de usuarios, productos, pedidos, rutas, reportes y configuración
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Preventista</p>
                <p className="text-muted-foreground">
                  Crea pedidos, gestiona clientes asignados, consulta productos y stock
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Package className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium">Armador</p>
                <p className="text-muted-foreground">
                  Arma pedidos pendientes, marca faltantes, genera comprobantes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Truck className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Repartidor</p>
                <p className="text-muted-foreground">
                  Entrega pedidos, cobra pagos, registra no-entregas, cierra rutas
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/users")}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
