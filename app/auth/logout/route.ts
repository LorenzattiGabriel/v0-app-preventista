import { createClient } from "@/lib/supabase/server"
import { NextResponse, NextRequest } from "next/server"
import { cookies } from "next/headers"

async function buildLogoutRedirect(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(`${origin}/auth/login`, {
    status: 302,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })

  try {
    // Invalida el token en Supabase
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Logout signOut error:', error)
  }

  // Borra explícitamente todas las cookies de Supabase en el response
  // (cookieStore.delete sola no garantiza que lleguen al Set-Cookie del NextResponse)
  try {
    const cookieStore = await cookies()
    cookieStore.getAll()
      .filter(c => c.name.includes('supabase') || c.name.startsWith('sb-'))
      .forEach(c => response.cookies.delete(c.name))
  } catch (error) {
    console.error('Logout cookie clear error:', error)
  }

  return response
}

// GET: Navegación directa a /auth/logout
export async function GET(request: NextRequest) {
  return buildLogoutRedirect(request)
}

// POST: Form submissions y fetch desde componentes
export async function POST(request: NextRequest) {
  return buildLogoutRedirect(request)
}
