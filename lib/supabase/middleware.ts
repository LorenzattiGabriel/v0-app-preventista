import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Skip auth check for API routes (especially /api/auth/*)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return supabaseResponse
  }

  // IMPORTANT: We're using simple authentication with localStorage, not Supabase Auth
  // So we skip the auth check entirely and let the app handle auth on the client side
  // The middleware just updates the Supabase session (which will be empty)
  
  return supabaseResponse
}
