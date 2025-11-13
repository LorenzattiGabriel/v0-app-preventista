
"use client"

import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface GoBackButtonProps {
  fallbackHref?: string
  text?: string
}

export function GoBackButton({ fallbackHref = "/preventista/dashboard", text = "Volver" }: GoBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBack = () => {
    // Check if document.referrer is available and from the same origin
    const canGoBack =
      typeof window !== "undefined" &&
      document.referrer &&
      new URL(document.referrer).origin === window.location.origin;

    // Check if the previous path is different from the current one
    const isDifferentPage = canGoBack && new URL(document.referrer).pathname !== pathname;

    if (isDifferentPage) {
      router.back();
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