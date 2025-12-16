import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"
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
export async function GET(request: NextRequest) {
  try {
    await performLogout()
  } catch (error) {
    console.error('Logout error:', error)
  }
  
  // Siempre redirigir a login usando la URL base del request
  // Esto funciona mejor en Vercel que new URL()
  const origin = request.nextUrl.origin
  return NextResponse.redirect(`${origin}/auth/login`, {
    status: 302,
    headers: {
      // Forzar que no se cachee el redirect
      'Cache-Control': 'no-store, max-age=0',
    }
  })
}

// POST: Para llamadas desde componentes/botones
export async function POST(request: NextRequest) {
  try {
    await performLogout()
    return NextResponse.json({ 
      success: true,
      redirectUrl: '/auth/login' 
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Error al cerrar sesión' }, { status: 500 })
  }
}

