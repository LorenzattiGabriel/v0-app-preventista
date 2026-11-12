// Portal de clientes: el admin genera un código de acceso por cliente (no
// email+contraseña real). Por debajo sigue siendo un usuario Supabase Auth
// normal — con un email sintético que el cliente nunca ve ni usa — para
// reaprovechar el middleware, las RLS y el resto de la infraestructura de
// auth tal cual está, sin armar un sistema de sesión paralelo.
//
// Requiere SUPABASE_SERVICE_ROLE_KEY: solo se llama desde rutas /api/admin/*
// (nunca desde el browser).

import { createClient as createAdminClient } from "@supabase/supabase-js"
import { synthEmailForCustomerCode } from "@/lib/utils/client-portal-code"

export const MIN_ACCESS_CODE_LENGTH = 6
export { synthEmailForCustomerCode }

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface PortalStatus {
  hasAccess: boolean
  profileId?: string
  isActive?: boolean
}

export async function getCustomerPortalStatus(customerId: string): Promise<PortalStatus> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("customer_id", customerId)
    .maybeSingle()

  if (!data) return { hasAccess: false }
  return { hasAccess: true, profileId: data.id, isActive: data.is_active }
}

/**
 * Crea o actualiza el código de acceso del cliente. Si ya tiene portal
 * (profiles.customer_id = customerId), le cambia la contraseña y lo
 * reactiva; si no, crea el usuario Auth + profile desde cero.
 */
export async function setCustomerAccessCode(
  customerId: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  if (!code || code.length < MIN_ACCESS_CODE_LENGTH) {
    return { success: false, error: `El código debe tener al menos ${MIN_ACCESS_CODE_LENGTH} caracteres` }
  }

  const admin = getAdminClient()

  const { data: customer, error: custErr } = await admin
    .from("customers")
    .select("id, code, commercial_name")
    .eq("id", customerId)
    .single()

  if (custErr || !customer) {
    return { success: false, error: "Cliente no encontrado" }
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle()

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: code,
      ban_duration: "none", // por si estaba revocado, reactivarlo
    })
    if (error) {
      console.error("[clientPortalService] updateUserById error", error)
      return { success: false, error: error.message || "Error al actualizar el código" }
    }
    await admin.from("profiles").update({ is_active: true }).eq("id", existing.id)
    return { success: true }
  }

  const email = synthEmailForCustomerCode(customer.code)

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: code,
    email_confirm: true,
    user_metadata: { full_name: customer.commercial_name, role: "cliente" },
  })

  if (authError || !authUser?.user) {
    console.error("[clientPortalService] createUser error", authError)
    return { success: false, error: authError?.message || "Error al crear el acceso del cliente" }
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    email,
    full_name: customer.commercial_name,
    role: "cliente",
    customer_id: customerId,
    is_active: true,
  })

  if (profileError) {
    console.error("[clientPortalService] profile insert error", profileError)
    await admin.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: "Error al crear el perfil del cliente" }
  }

  return { success: true }
}

/** Revoca el acceso al portal sin borrar el historial (banea el usuario Auth). */
export async function revokeCustomerAccess(customerId: string): Promise<{ success: boolean; error?: string }> {
  const admin = getAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("customer_id", customerId)
    .maybeSingle()

  if (!profile) return { success: true }

  const { error: banError } = await admin.auth.admin.updateUserById(profile.id, {
    ban_duration: "876000h", // ~100 años: equivalente a deshabilitado
  })
  if (banError) {
    console.error("[clientPortalService] revoke ban error", banError)
    return { success: false, error: banError.message }
  }

  await admin.from("profiles").update({ is_active: false }).eq("id", profile.id)
  return { success: true }
}
