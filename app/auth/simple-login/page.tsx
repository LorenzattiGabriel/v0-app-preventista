"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SimpleLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/simple-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar sesión")
      }

      // Store user data in localStorage for simple auth
      localStorage.setItem("user", JSON.stringify(data.user))

      // Redirect based on role
      const roleRoutes: Record<string, string> = {
        preventista: "/preventista/dashboard",
        encargado_armado: "/armado/dashboard",
        repartidor: "/repartidor/dashboard",
        cliente: "/cliente/dashboard",
        administrativo: "/admin/dashboard",
      }

      router.push(roleRoutes[data.user.role] || "/")
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/40">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sistema de Gestión</CardTitle>
            <CardDescription>Ingrese sus credenciales para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </div>
            </form>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Usuarios de prueba:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <strong>Admin:</strong> admin@distribuidora.com / admin123
                </p>
                <p>
                  <strong>Preventista:</strong> preventista1@distribuidora.com / prev123
                </p>
                <p>
                  <strong>Armado:</strong> armado1@distribuidora.com / armado123
                </p>
                <p>
                  <strong>Repartidor:</strong> repartidor1@distribuidora.com / repar123
                </p>
                <p>
                  <strong>Cliente:</strong> cliente1@email.com / cliente123
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
