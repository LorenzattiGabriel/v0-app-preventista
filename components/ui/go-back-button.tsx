
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
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    const isSameOrigin = hasHistory && document.referrer.startsWith(window.location.origin);

    if (isSameOrigin) {
      const referrerUrl = new URL(document.referrer);
      // If the previous URL has query params, navigate to its path without them.
      // This is useful for returning from a detail page to a filtered list.
      if (referrerUrl.search) {
        router.push(referrerUrl.pathname);
      } else {
        // Otherwise, just go back as normal.
        router.back();
      }
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