-- ============================================
-- MOCK USERS FOR PROTOTYPE
-- ============================================
-- This file serves as reference data for the mock users
-- Run the Node.js script (scripts/create-mock-users.js) to actually create these users
-- The script will create users in Supabase Auth and link them to profiles

-- ADMINISTRATIVOS (2 users)
-- Email: admin@distribuidora.com | Password: admin123
-- Email: admin2@distribuidora.com | Password: admin123

-- PREVENTISTAS (3 users)
-- Email: preventista1@distribuidora.com | Password: prev123
-- Email: preventista2@distribuidora.com | Password: prev123
-- Email: preventista3@distribuidora.com | Password: prev123

-- ENCARGADOS DE ARMADO (3 users)
-- Email: armado1@distribuidora.com | Password: armado123
-- Email: armado2@distribuidora.com | Password: armado123
-- Email: armado3@distribuidora.com | Password: armado123

-- REPARTIDORES (4 users)
-- Email: repartidor1@distribuidora.com | Password: repar123
-- Email: repartidor2@distribuidora.com | Password: repar123
-- Email: repartidor3@distribuidora.com | Password: repar123
-- Email: repartidor4@distribuidora.com | Password: repar123

-- CLIENTES (5 users)
-- Email: cliente1@email.com | Password: cliente123
-- Email: cliente2@email.com | Password: cliente123
-- Email: cliente3@email.com | Password: cliente123
-- Email: cliente4@email.com | Password: cliente123
-- Email: cliente5@email.com | Password: cliente123

-- ============================================
-- USER DATA STRUCTURE
-- ============================================

/*
{
  "administrativos": [
    { "email": "admin@distribuidora.com", "password": "admin123", "full_name": "Carlos Administrador", "phone": "351-6660001" },
    { "email": "admin2@distribuidora.com", "password": "admin123", "full_name": "María Supervisora", "phone": "351-6660002" }
  ],
  "preventistas": [
    { "email": "preventista1@distribuidora.com", "password": "prev123", "full_name": "Juan Preventista", "phone": "351-6660003" },
    { "email": "preventista2@distribuidora.com", "password": "prev123", "full_name": "Laura Vendedora", "phone": "351-6660004" },
    { "email": "preventista3@distribuidora.com", "password": "prev123", "full_name": "Roberto Ventas", "phone": "351-6660005" }
  ],
  "encargado_armado": [
    { "email": "armado1@distribuidora.com", "password": "armado123", "full_name": "Pedro Armador", "phone": "351-6660006" },
    { "email": "armado2@distribuidora.com", "password": "armado123", "full_name": "Ana Depósito", "phone": "351-6660007" },
    { "email": "armado3@distribuidora.com", "password": "armado123", "full_name": "Jorge Preparador", "phone": "351-6660008" }
  ],
  "repartidores": [
    { "email": "repartidor1@distribuidora.com", "password": "repar123", "full_name": "Carlos Méndez", "phone": "351-6661111" },
    { "email": "repartidor2@distribuidora.com", "password": "repar123", "full_name": "Roberto Díaz", "phone": "351-6662222" },
    { "email": "repartidor3@distribuidora.com", "password": "repar123", "full_name": "Martín Gómez", "phone": "351-6663333" },
    { "email": "repartidor4@distribuidora.com", "password": "repar123", "full_name": "Diego Transportista", "phone": "351-6664444" }
  ],
  "clientes": [
    { "email": "cliente1@email.com", "password": "cliente123", "full_name": "José Pérez", "phone": "351-5551234" },
    { "email": "cliente2@email.com", "password": "cliente123", "full_name": "María González", "phone": "351-5552345" },
    { "email": "cliente3@email.com", "password": "cliente123", "full_name": "Carlos Rodríguez", "phone": "351-5553456" },
    { "email": "cliente4@email.com", "password": "cliente123", "full_name": "Ana Martínez", "phone": "351-5554567" },
    { "email": "cliente5@email.com", "password": "cliente123", "full_name": "Roberto Sánchez", "phone": "351-5555678" }
  ]
}
*/
