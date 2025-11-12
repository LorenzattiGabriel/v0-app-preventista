import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { NextResponse } from 'next/server'



export async function middleware(request: NextRequest) {
  // updateSession returns a response object that handles session management.
  // It might be a redirect or a response with new cookies.
  const response = await updateSession(request)

  // Add the x-pathname header to the request headers for use in server components.
  response.headers.set("x-pathname", request.nextUrl.pathname)

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
