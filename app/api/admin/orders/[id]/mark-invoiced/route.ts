import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const ALLOWED_ROLES = ["administrativo"]

/**
 * POST /api/admin/orders/[id]/mark-invoiced
 * Marca un pedido como facturado y guarda el archivo de factura.
 * Body: { invoice_number?: string, invoice_file_url?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const invoice_number: string | null =
      typeof body.invoice_number === "string" && body.invoice_number.trim()
        ? body.invoice_number.trim()
        : null
    const invoice_file_url: string | null =
      typeof body.invoice_file_url === "string" && body.invoice_file_url.trim()
        ? body.invoice_file_url.trim()
        : null

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, requires_invoice, is_invoiced")
      .eq("id", orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 })
    }

    if (!order.requires_invoice) {
      return NextResponse.json(
        { error: "El pedido no requiere factura" },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        is_invoiced: true,
        invoice_number,
        invoice_file_url,
        invoiced_at: new Date().toISOString(),
        invoiced_by: user.id,
      })
      .eq("id", orderId)

    if (updateError) {
      console.error("[mark-invoiced] update error:", updateError)
      return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
    }

    revalidatePath("/admin/orders")
    revalidatePath("/admin/dashboard")
    revalidatePath(`/admin/orders/${orderId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[mark-invoiced] internal error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
