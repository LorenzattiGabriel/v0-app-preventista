import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 })
    }

    const supabase = await createClient()

    // Query the profiles table to check credentials
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .eq("pwd", password)
      .eq("is_active", true)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // Return user data (without password)
    const { pwd, ...userWithoutPassword } = profile

    return NextResponse.json({
      user: userWithoutPassword,
      message: "Login exitoso",
    })
  } catch (error) {
    console.error("[v0] Simple login error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
