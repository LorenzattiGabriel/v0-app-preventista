import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function performLogout() {
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
}

// GET: Para navegación directa a /auth/logout
export async function GET(request: Request) {
  try {
    await performLogout()
    
    // Redirigir a la página de login
    const url = new URL('/auth/login', request.url)
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('Logout error:', error)
    // En caso de error, igual redirigir a login
    const url = new URL('/auth/login', request.url)
    return NextResponse.redirect(url)
  }
}

// POST: Para llamadas desde componentes/botones
export async function POST() {
  try {
    await performLogout()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}

