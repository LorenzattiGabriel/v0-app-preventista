"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { synthEmailForCustomerCode } from "@/lib/utils/client-portal-code"

export default function ClienteLoginPage() {
  const [customerCode, setCustomerCode] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const email = synthEmailForCustomerCode(customerCode.trim())
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: accessCode,
      })

      if (signInError) {
        throw new Error("Código de cuenta o código de acceso incorrecto")
      }

      router.push("/cliente/dashboard")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/40">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Mi Cuenta</CardTitle>
            <CardDescription>Ingresá con el código que te dio tu distribuidor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="customerCode">Código de cuenta</Label>
                  <Input
                    id="customerCode"
                    placeholder="Ej: CLI-0043"
                    required
                    value={customerCode}
                    onChange={(e) => setCustomerCode(e.target.value)}
                    disabled={isLoading}
                    autoCapitalize="characters"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accessCode">Código de acceso</Label>
                  <Input
                    id="accessCode"
                    type="password"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Ingresando..." : "Ingresar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
