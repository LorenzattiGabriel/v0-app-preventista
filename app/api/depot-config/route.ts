import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/depot-config
 * Returns the active depot configuration (public endpoint for all authenticated users)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Get active depot configuration
    const { data: depot, error } = await supabase
      .from("depot_configuration")
      .select("id, name, presencial_order_radius_meters, radius_meters")
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("Error fetching depot config:", error)
      // Return default values if no config exists
      return NextResponse.json({
        presencial_order_radius_meters: 600,
        radius_meters: 200,
      })
    }

    return NextResponse.json({
      presencial_order_radius_meters: depot.presencial_order_radius_meters || 600,
      radius_meters: depot.radius_meters || 200,
    })
  } catch (error) {
    console.error("Error in depot-config API:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
