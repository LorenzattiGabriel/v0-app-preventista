"use client"

import { usePathname } from "next/navigation"
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"

interface NavigationHistoryContextType {
  previousPath: string | null
}

const NavigationHistoryContext = createContext<NavigationHistoryContextType>({
  previousPath: null,
})

export const useNavigationHistory = () => useContext(NavigationHistoryContext)

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)
  const [previousPath, setPreviousPath] = useState<string | null>(null)

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      setPreviousPath(previousPathRef.current)
      previousPathRef.current = pathname
    }
  }, [pathname])

  return (
    <NavigationHistoryContext.Provider value={{ previousPath }}>
      {children}
    </NavigationHistoryContext.Provider>
  )
}
