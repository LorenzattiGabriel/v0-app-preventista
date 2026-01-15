import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/orders/[id]
 * Get order details with all related data (for receipts, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        customers (
          id,
          commercial_name,
          name,
          street,
          street_number,
          locality,
          province,
          phone
        ),
        order_items (
          *,
          products (
            id,
            code,
            name,
            brand
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error: any) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: error.message || "Error al obtener el pedido" },
      { status: 500 }
    )
  }
}





