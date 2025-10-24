import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Cerrar sesión en Supabase
  await supabase.auth.signOut()
  
  // Limpiar todas las cookies relacionadas con Supabase
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  allCookies.forEach(cookie => {
    if (cookie.name.includes('supabase')) {
      cookieStore.delete(cookie.name)
    }
  })
  
  // Obtener la URL base de la aplicación desde el request
  const url = new URL(request.url)
  const redirectUrl = new URL("/auth/login", url.origin)
  
  return NextResponse.redirect(redirectUrl)
}

