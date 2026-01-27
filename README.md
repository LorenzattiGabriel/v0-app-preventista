# Sistema de Gestión de Pedidos y Preventistas

Sistema integral de gestión de pedidos que abarca desde la toma de pedidos por preventistas hasta la entrega final al cliente, incluyendo control de armado, optimización de rutas y seguimiento en tiempo real.

## 🚀 Características Principales

- **5 Perfiles de Usuario**: Preventista, Encargado de Armado, Repartidor, Cliente, Administrativo
- **Gestión Completa de Pedidos**: Desde registro hasta entrega
- **Optimización de Rutas**: Algoritmo de optimización para entregas eficientes
- **Seguimiento en Tiempo Real**: Tracking de pedidos y entregas
- **Control de Inventario**: Gestión de faltantes y stock
- **Sistema de Calificaciones**: Feedback de clientes

## 📋 Módulos del Sistema

### 1. Módulo de Registro de Pedidos (Preventista)
- Registro de nuevos pedidos
- Gestión de clientes
- Selección de productos con precios diferenciados
- Cálculo automático de totales y descuentos

### 2. Módulo de Armado (Encargado de Armado)
- Visualización de pedidos pendientes
- Verificación de productos
- Registro de faltantes
- Confirmación de armado

### 3. Módulo de Cliente
- Visualización de pedidos
- Seguimiento de entregas
- Sistema de calificaciones

### 4. Módulo de Repartidor
- Visualización de rutas asignadas
- Gestión de entregas
- Confirmación de pagos

### 5. Módulo de Generación de Rutas (Administrativo)
- Generación automática de rutas optimizadas
- Asignación de repartidores
- Gestión de zonas

### 6. Panel Administrativo
- Reportes y estadísticas
- Gestión de usuarios
- Análisis de rendimiento

## 🗄️ Base de Datos

El sistema utiliza Supabase con PostgreSQL. La estructura incluye:

- **profiles**: Usuarios del sistema con roles
- **customers**: Clientes (mayoristas/minoristas)
- **products**: Catálogo de productos
- **orders**: Pedidos con estados
- **order_items**: Detalle de pedidos
- **routes**: Rutas de entrega
- **zones**: Zonas de distribución

## 🔐 Autenticación Simplificada

Para prototipado, el sistema usa autenticación simple con contraseñas en texto plano.

### Usuarios de Prueba

**Administrativos:**
- admin@distribuidora.com / admin123
- admin2@distribuidora.com / admin123

**Preventistas:**
- preventista1@distribuidora.com / prev123
- preventista2@distribuidora.com / prev123
- preventista3@distribuidora.com / prev123

**Encargados de Armado:**
- armado1@distribuidora.com / armado123
- armado2@distribuidora.com / armado123
- armado3@distribuidora.com / armado123

**Repartidores:**
- repartidor1@distribuidora.com / repar123
- repartidor2@distribuidora.com / repar123
- repartidor3@distribuidora.com / repar123
- repartidor4@distribuidora.com / repar123

**Clientes:**
- cliente1@email.com / cliente123
- cliente2@email.com / cliente123
- cliente3@email.com / cliente123
- cliente4@email.com / cliente123
- cliente5@email.com / cliente123

## 🛠️ Instalación y Configuración

### 1. Ejecutar Scripts SQL

Ejecuta los scripts en orden desde la carpeta `scripts/`:

\`\`\`bash
001_create_database_schema.sql    # Crea la estructura de la base de datos
002_row_level_security.sql        # Configura políticas de seguridad
005_add_password_column.sql       # Agrega columna de contraseña
006_seed_products_customers_orders.sql  # Carga productos, clientes y pedidos
007_seed_mock_users_simple.sql    # Carga usuarios de prueba
\`\`\`

### 2. Configurar Variables de Entorno

Las variables de Supabase ya están configuradas en el proyecto.

### 3. Iniciar la Aplicación

\`\`\`bash
npm install
npm run dev
\`\`\`

La aplicación estará disponible en `http://localhost:3000`

## 📊 Flujo de Estados de Pedidos

\`\`\`
BORRADOR → PENDIENTE_ARMADO → EN_ARMADO → PENDIENTE_ENTREGA → EN_REPARTICION → ENTREGADO
                                    ↓
                            ESPERANDO_STOCK
                                    ↓
                              CANCELADO
\`\`\`

## 🎯 Prioridades de Pedidos

- **Urgente**: Máxima prioridad
- **Alta**: Prioridad alta
- **Media**: Prioridad media
- **Normal**: Prioridad estándar
- **Baja**: Prioridad baja

## 📦 Productos de Ejemplo

El sistema incluye 10 productos de prueba:
1. Aceite Girasol 900ml - Cocinero
2. Arroz Largo Fino 1kg - Gallo Oro
3. Azúcar 1kg - Ledesma
4. Fideos Tirabuzón 500g - Matarazzo
5. Harina 0000 1kg - Pureza
6. Sal Fina 500g - Celusal
7. Yerba Mate 1kg - Playadito
8. Café Molido 250g - La Virginia
9. Polenta 500g - Presto Pronta
10. Lentejas 500g - Arcor

## 🏪 Clientes de Ejemplo

8 clientes distribuidos en 3 zonas:
- Almacén Don José (Mayorista - Zona 1)
- Despensa La Esquina (Minorista - Zona 1)
- Super Familia Rodríguez (Mayorista - Zona 2)
- Kiosco El Rápido (Minorista - Zona 2)
- Minimercado Los Andes (Mayorista - Zona 3)
- Almacén Central (Minorista - Zona 1)
- Despensa San Vicente (Minorista - Zona 3)
- Distribuidora El Progreso (Mayorista - Zona 2)

## 📝 Pedidos de Ejemplo

4 pedidos en diferentes estados:
- PED-0001: PENDIENTE_ARMADO (Alta prioridad)
- PED-0002: PENDIENTE_ENTREGA (Ya armado)
- PED-0003: EN_REPARTICION (En camino)
- PED-0004: ENTREGADO (Completado con calificación 5★)

## 🔧 Tecnologías

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes, Server Actions
- **Base de Datos**: Supabase (PostgreSQL)
- **UI**: Tailwind CSS, shadcn/ui
- **Autenticación**: Sistema simplificado para prototipado

## 📱 Acceso por Rol

Cada usuario es redirigido automáticamente a su dashboard según su rol:

- **Preventista** → `/preventista/dashboard`
- **Encargado de Armado** → `/armado/dashboard`
- **Repartidor** → `/repartidor/dashboard`
- **Cliente** → `/cliente/dashboard`
- **Administrativo** → `/admin/dashboard`

## ⚠️ Nota Importante

Este sistema usa autenticación simplificada con contraseñas en texto plano para facilitar el prototipado. **NO usar en producción**. Para producción, implementar autenticación segura con Supabase Auth o similar.

building v2.1.17
