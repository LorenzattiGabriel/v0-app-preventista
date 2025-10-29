import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
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
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}

