'use client'

import { useState, useEffect } from 'react'

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'

/**
 * Hook for loading Google Maps API - ensures single load across components
 */
export function useGoogleMapsScript() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return

    // If google maps is already loaded, mark as ready
    if (window.google?.maps) {
      setIsLoaded(true)
      return
    }

    // Check if script is already in DOM
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)
    
    if (existingScript) {
      // Script exists, wait for it to load
      existingScript.addEventListener('load', () => setIsLoaded(true))
      // Check if already loaded
      if (window.google?.maps) {
        setIsLoaded(true)
      }
      return
    }

    // Create and append script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('[GoogleMaps] API key not configured')
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setIsLoaded(true)
    script.onerror = () => console.error('[GoogleMaps] Failed to load script')
    
    document.head.appendChild(script)

    // Cleanup is intentionally omitted - script should persist
  }, [])

  return isLoaded
}






