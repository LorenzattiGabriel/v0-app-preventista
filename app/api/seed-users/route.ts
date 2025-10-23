import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Mock users data
const mockUsers = {
  administrativo: [
    { email: "admin@distribuidora.com", password: "admin123", full_name: "Carlos Administrador", phone: "351-6660001" },
    { email: "admin2@distribuidora.com", password: "admin123", full_name: "María Supervisora", phone: "351-6660002" },
  ],
  preventista: [
    {
      email: "preventista1@distribuidora.com",
      password: "prev123",
      full_name: "Juan Preventista",
      phone: "351-6660003",
    },
    {
      email: "preventista2@distribuidora.com",
      password: "prev123",
      full_name: "Laura Vendedora",
      phone: "351-6660004",
    },
    { email: "preventista3@distribuidora.com", password: "prev123", full_name: "Roberto Ventas", phone: "351-6660005" },
  ],
  encargado_armado: [
    { email: "armado1@distribuidora.com", password: "armado123", full_name: "Pedro Armador", phone: "351-6660006" },
    { email: "armado2@distribuidora.com", password: "armado123", full_name: "Ana Depósito", phone: "351-6660007" },
    { email: "armado3@distribuidora.com", password: "armado123", full_name: "Jorge Preparador", phone: "351-6660008" },
  ],
  repartidor: [
    { email: "repartidor1@distribuidora.com", password: "repar123", full_name: "Carlos Méndez", phone: "351-6661111" },
    { email: "repartidor2@distribuidora.com", password: "repar123", full_name: "Roberto Díaz", phone: "351-6662222" },
    { email: "repartidor3@distribuidora.com", password: "repar123", full_name: "Martín Gómez", phone: "351-6663333" },
    {
      email: "repartidor4@distribuidora.com",
      password: "repar123",
      full_name: "Diego Transportista",
      phone: "351-6664444",
    },
  ],
  cliente: [
    { email: "cliente1@email.com", password: "cliente123", full_name: "José Pérez", phone: "351-5551234" },
    { email: "cliente2@email.com", password: "cliente123", full_name: "María González", phone: "351-5552345" },
    { email: "cliente3@email.com", password: "cliente123", full_name: "Carlos Rodríguez", phone: "351-5553456" },
    { email: "cliente4@email.com", password: "cliente123", full_name: "Ana Martínez", phone: "351-5554567" },
    { email: "cliente5@email.com", password: "cliente123", full_name: "Roberto Sánchez", phone: "351-5555678" },
  ],
}

export async function POST(request: Request) {
  try {
    // Check for authorization (optional - add a secret key check in production)
    const { authorization } = await request.json().catch(() => ({}))

    // Initialize Supabase Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const results = {
      success: [] as string[],
      errors: [] as { email: string; error: string }[],
    }

    // Create users for each role
    for (const [role, users] of Object.entries(mockUsers)) {
      for (const userData of users) {
        try {
          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              full_name: userData.full_name,
              phone: userData.phone,
            },
          })

          if (authError) {
            results.errors.push({ email: userData.email, error: authError.message })
            continue
          }

          // Create profile
          const { error: profileError } = await supabase.from("profiles").insert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: role,
            phone: userData.phone,
            is_active: true,
          })

          if (profileError) {
            results.errors.push({ email: userData.email, error: profileError.message })
            continue
          }

          results.success.push(userData.email)
        } catch (error) {
          results.errors.push({
            email: userData.email,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }

    return NextResponse.json({
      message: "Mock users creation completed",
      summary: {
        total: results.success.length + results.errors.length,
        success: results.success.length,
        errors: results.errors.length,
      },
      results,
    })
  } catch (error) {
    console.error("Error creating mock users:", error)
    return NextResponse.json({ error: "Failed to create mock users" }, { status: 500 })
  }
}
