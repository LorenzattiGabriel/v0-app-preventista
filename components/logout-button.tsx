"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        router.push("/auth/login")
        router.refresh()
      } else {
        console.error("Error al cerrar sesión")
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="ghost" onClick={handleLogout} disabled={isLoading}>
      <LogOut className="mr-2 h-4 w-4" />
      {isLoading ? "Cerrando..." : "Cerrar Sesión"}
    </Button>
  )
}

