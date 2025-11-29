// Geocoding service to convert addresses to coordinates
// Uses Google Maps Geocoding API or Nominatim (OpenStreetMap) as fallback

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
}

export class GeocodingService {
  /**
   * Geocode an address to coordinates
   * Uses browser Geocoding API if available, falls back to Nominatim
   */
  static async geocodeAddress(address: {
    street: string
    streetNumber: string
    locality: string
    province: string
    country?: string
  }): Promise<GeocodingResult | null> {
    const fullAddress = `${address.street} ${address.streetNumber}, ${address.locality}, ${address.province}, ${address.country || 'Argentina'}`
    
    try {
      // Try Nominatim (OpenStreetMap) - free and no API key required
      const nominatimResult = await this.geocodeWithNominatim(fullAddress)
      if (nominatimResult) {
        return nominatimResult
      }

      // If Nominatim fails, could add other services here
      console.error('Geocoding failed for address:', fullAddress)
      return null
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  /**
   * Geocode using Nominatim (OpenStreetMap)
   * Free service, no API key required
   */
  private static async geocodeWithNominatim(address: string): Promise<GeocodingResult | null> {
    try {
      const encodedAddress = encodeURIComponent(address)
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&addressdetails=1`
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DistribuidoraApp/1.0', // Required by Nominatim
        },
      })

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`)
      }

      const data = await response.json()

      if (data && data.length > 0) {
        const result = data[0]
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          formattedAddress: result.display_name,
        }
      }

      return null
    } catch (error) {
      console.error('Nominatim geocoding error:', error)
      return null
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   * Uses Haversine formula
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  /**
   * Check if a location is within a radius of a target location
   */
  static isWithinRadius(
    currentLat: number,
    currentLon: number,
    targetLat: number,
    targetLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon)
    return distance <= radiusMeters
  }

  /**
   * Get current device location using browser Geolocation API
   */
  static async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser')
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting current location:', error)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }
}

