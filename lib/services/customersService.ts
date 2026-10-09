import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Columnas que realmente consume el formulario de pedido y sus componentes
 * (selector, popup de detalle, validación de GPS, ventana horaria, descuentos).
 *
 * No usar select("*"): son 47 columnas y el payload que viaja al navegador pasa
 * de 773 KB a 1,1 MB sin que nadie use la diferencia.
 */
const ORDER_FORM_CUSTOMER_COLUMNS = [
  "id",
  "code",
  "commercial_name",
  "legal_name",
  "contact_name",
  "customer_type",
  "iva_condition",
  "tax_id",
  "email",
  "phone",
  "street",
  "street_number",
  "floor_apt",
  "locality",
  "province",
  "postal_code",
  "address_notes",
  "latitude",
  "longitude",
  "zone_id",
  "credit_limit",
  "credit_days",
  "current_balance",
  "general_discount",
  "has_time_restriction",
  "delivery_window_start",
  "delivery_window_end",
  "time_restriction_notes",
  "observations",
  "is_active",
  "created_at",
].join(",")

const PAGE_SIZE = 1000

/**
 * Trae TODOS los clientes activos para el formulario de pedido.
 *
 * 🚨 Por qué pagina: PostgREST corta en 1000 filas cuando no se pide un rango.
 * Con `.order("commercial_name")` los que se perdían eran los del final del
 * abecedario, así que al buscar por Y o Z el cliente simplemente no aparecía
 * (ya había 1001 clientes activos y el problema crece con cada alta nueva).
 */
export async function getActiveCustomersForOrderForm(supabase: SupabaseClient) {
  const customers: any[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from("customers")
      .select(ORDER_FORM_CUSTOMER_COLUMNS)
      .eq("is_active", true)
      .order("commercial_name")
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error("[customersService] Error trayendo clientes:", error)
      throw error
    }

    if (!data || data.length === 0) break
    customers.push(...data)

    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return customers
}
