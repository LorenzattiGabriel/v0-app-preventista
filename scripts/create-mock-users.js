import { createClient } from "@supabase/supabase-js"

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

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createMockUsers() {
  console.log("🚀 Starting mock user creation...\n")

  let successCount = 0
  let errorCount = 0

  for (const [role, users] of Object.entries(mockUsers)) {
    console.log(`\n📋 Creating ${role} users...`)

    for (const userData of users) {
      try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Auto-confirm email for testing
          user_metadata: {
            full_name: userData.full_name,
            phone: userData.phone,
          },
        })

        if (authError) {
          console.error(`  ❌ Error creating ${userData.email}:`, authError.message)
          errorCount++
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
          console.error(`  ❌ Error creating profile for ${userData.email}:`, profileError.message)
          errorCount++
          continue
        }

        console.log(`  ✅ Created: ${userData.email} (${userData.full_name})`)
        successCount++
      } catch (error) {
        console.error(`  ❌ Unexpected error for ${userData.email}:`, error)
        errorCount++
      }
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log(`✨ Mock user creation completed!`)
  console.log(`   Success: ${successCount} users`)
  console.log(`   Errors: ${errorCount} users`)
  console.log("=".repeat(50) + "\n")

  console.log("📝 Login credentials summary:")
  console.log("\nAdministrativos:")
  console.log("  admin@distribuidora.com / admin123")
  console.log("  admin2@distribuidora.com / admin123")
  console.log("\nPreventistas:")
  console.log("  preventista1@distribuidora.com / prev123")
  console.log("  preventista2@distribuidora.com / prev123")
  console.log("  preventista3@distribuidora.com / prev123")
  console.log("\nEncargados de Armado:")
  console.log("  armado1@distribuidora.com / armado123")
  console.log("  armado2@distribuidora.com / armado123")
  console.log("  armado3@distribuidora.com / armado123")
  console.log("\nRepartidores:")
  console.log("  repartidor1@distribuidora.com / repar123")
  console.log("  repartidor2@distribuidora.com / repar123")
  console.log("  repartidor3@distribuidora.com / repar123")
  console.log("  repartidor4@distribuidora.com / repar123")
  console.log("\nClientes:")
  console.log("  cliente1@email.com / cliente123")
  console.log("  cliente2@email.com / cliente123")
  console.log("  cliente3@email.com / cliente123")
  console.log("  cliente4@email.com / cliente123")
  console.log("  cliente5@email.com / cliente123")
}

// Run the script
createMockUsers()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
