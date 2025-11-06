
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface GoBackButtonProps {
  fallbackHref?: string
  text?: string
}

export function GoBackButton({ fallbackHref = "/preventista/dashboard", text = "Volver" }: GoBackButtonProps) {
  const router = useRouter()

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <Button variant="outline" type="button" onClick={handleGoBack}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      {text}
    </Button>
  )
}