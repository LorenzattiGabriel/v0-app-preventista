# DOCUMENTO DE FUNCIONALIDADES - SISTEMA DE GESTIÓN DE DISTRIBUCIÓN Y ENTREGAS

**Versión:** 1.0
**Fecha:** Enero 2026
**Tecnología:** Next.js 16, React, TypeScript, PostgreSQL (Supabase)

---

## 1. DESCRIPCIÓN GENERAL DEL SISTEMA

Sistema web integral para la gestión completa del ciclo de ventas, armado y distribución de pedidos, con optimización inteligente de rutas, control de inventario, cuenta corriente de clientes y seguimiento en tiempo real.

**Modalidad:** Aplicación Web Progresiva (PWA) - Funciona en computadoras, tablets y smartphones

**Roles de Usuario:** 5 niveles de acceso diferenciados
- Administrativo (acceso total)
- Preventista/Vendedor
- Encargado de Armado
- Repartidor/Conductor
- Cliente

---

## 2. MÓDULO ADMINISTRATIVO

### 2.1 Dashboard Ejecutivo
- **Métricas en tiempo real:**
  - Total de pedidos activos
  - Pedidos pendientes de entrega
  - Entregas programadas
  - Rutas activas
  - Clientes registrados
  - Repartidores activos
  - **Sistema de pedidos retrasados** con alertas por severidad

- **Sistema de Satisfacción del Cliente:**
  - Calificaciones promedio (productos y repartidores)
  - Análisis de tendencias
  - Filtros por período

### 2.2 Gestión de Pedidos

#### 2.2.1 Lista General de Pedidos
- Filtros avanzados: estado, fechas, cliente, preventista
- Vista completa con todos los detalles
- Estados visuales con código de colores
- Paginación optimizada para grandes volúmenes
- Búsqueda en tiempo real

#### 2.2.2 Gestión de Pedidos Retrasados
**Funcionalidad destacada:**
- **Detección automática** de pedidos con fecha vencida
- **Clasificación por severidad:**
  - Leve (1-3 días)
  - Moderado (4-7 días)
  - Crítico (>7 días)
- **Reprogramación individual o masiva**
- Historial completo de cambios de fecha
- Opción de aumentar prioridad automáticamente
- Exclusión automática de pedidos ya en rutas activas

#### 2.2.3 Acciones sobre Pedidos
- Ver detalle completo
- Editar información
- Cancelar pedidos
- Reprogramar fechas de entrega
- Registrar pagos manuales

### 2.3 Generador de Rutas Inteligentes

**Tecnología:** Microservicio de optimización con algoritmo VRPTW v2.0 (Vehicle Routing Problem with Time Windows)

#### Características principales:
- **Optimización automática de rutas:**
  - Algoritmo basado en Google Maps Directions API
  - Minimización de distancia y tiempo
  - Orden óptimo de entregas
  - Respeto de restricciones horarias

- **Restricciones Horarias (VRPTW):**
  - Ventanas de tiempo por cliente (ej: 08:00-12:00)
  - Cálculo de tiempos de espera
  - Validación de factibilidad
  - Alertas si no es posible cumplir horarios

- **Selección Inteligente de Pedidos:**
  - Filtros por fecha, localidad, prioridad
  - Selección manual o automática
  - Validación de coordenadas GPS
  - Agrupación por zonas

- **Cálculo de Costos Operativos:**
  - Tipos de vehículo: Auto, Camioneta, Utilitario, Moto
  - Tipos de combustible: Nafta, Gasoil, GNC, Eléctrico
  - Consumo de combustible (litros y pesos)
  - Costo de mano de obra del conductor
  - **Costo total proyectado de la ruta**

- **Rutas de más de 25 paradas:**
  - Segmentación automática (límite de Google Maps)
  - URLs de navegación por tramo
  - Orden optimizado mantenido

- **Vista Previa Completa:**
  - Mapa interactivo con ruta trazada
  - Distancia total (km)
  - Duración estimada (minutos)
  - Desglose de costos
  - Métricas VRPTW detalladas
  - Botón de navegación a Google Maps

### 2.4 Gestión de Rutas

- Lista completa de rutas (planificadas, activas, completadas)
- Filtros por fecha, conductor, estado
- Detalle de ruta con mapa
- Seguimiento en tiempo real del progreso
- Resumen de recaudación por ruta
- Acceso a comprobantes de entrega

### 2.5 Gestión de Productos e Inventario

#### 2.5.1 Catálogo de Productos
- Lista completa con filtros múltiples
- Búsqueda por código, nombre, marca
- Información detallada:
  - Código único
  - Nombre, marca, categoría
  - Precios: base, mayorista, minorista
  - Stock actual vs. mínimo
  - **Alertas visuales de stock bajo**
  - Estado activo/inactivo

#### 2.5.2 Creación/Edición de Productos
- Formulario completo con:
  - Información básica
  - Múltiples precios
  - Control de inventario
  - Datos logísticos (peso, volumen)
  - Código de barras
  - **Soporte para cantidades decimales** (carnes, granos, líquidos)

#### 2.5.3 Gestión de Stock

**Edición Inline:**
- Cambio rápido de stock sin abrir formulario
- Validación en tiempo real
- Generación automática de movimiento de auditoría

**Importación Masiva CSV:**
- Actualización de inventario por lotes
- Preview antes de confirmar
- Validación de formato
- Plantilla descargable
- Batch tracking para auditoría

**Sistema de Auditoría Completo:**
- **Registro de TODOS los movimientos de stock**
- Tipos de movimientos:
  - Edición manual
  - Importación CSV
  - Descuento por armado de pedido
  - Ajuste de inventario
  - Recepción de compra
  - Devolución
  - Baja por daño o vencimiento

- **Información registrada:**
  - Stock anterior y nuevo
  - Cantidad modificada
  - Usuario responsable
  - Fecha y hora exacta
  - Notas adicionales
  - Referencia (pedido, compra, etc.)

- **Historial consultable:**
  - Filtros por producto, tipo, usuario, fecha
  - Exportación a Excel
  - Trazabilidad completa

### 2.6 Gestión de Clientes

#### 2.6.1 Base de Datos de Clientes
- Lista completa con búsqueda avanzada
- Filtros por tipo (mayorista/minorista), zona, estado
- Información completa visible:
  - Código de cliente
  - Datos comerciales y fiscales
  - Ubicación y zona
  - **Saldo de cuenta corriente**
  - Límite de crédito
  - Descuento general

#### 2.6.2 Alta/Edición de Clientes
**Formulario completo:**
- Información comercial y de contacto
- Información fiscal (CUIT, condición IVA)
- Domicilio completo
- **Mapa interactivo para ubicación GPS exacta**
  - Selección por click
  - Arrastrar marcador
  - Geolocalización automática
- Condiciones comerciales (crédito, descuentos)
- **Restricciones horarias de entrega**
- Prioridad del cliente
- Zona asignada

#### 2.6.3 Cuenta Corriente por Cliente
**Sistema completo de gestión financiera:**

- **Vista de Cuenta Corriente:**
  - Saldo actual (deuda/favor)
  - Límite de crédito
  - Crédito disponible
  - Estado de pagos (al día/vencido)

- **Pedidos con Deuda Pendiente:**
  - Lista detallada
  - Monto total vs. pagado vs. deuda
  - Fecha de vencimiento
  - Indicador de vencido
  - Botón de registro de pago

- **Historial Completo de Movimientos:**
  - Todos los débitos y créditos
  - Saldo acumulado después de cada movimiento
  - Comprobantes adjuntos
  - Exportación a Excel

### 2.7 Gestión de Usuarios

- **Creación y administración de usuarios**
- **Roles disponibles:** Administrativo, Preventista, Repartidor, Armado, Cliente
- Cambio de contraseñas
- Activación/desactivación
- Control de acceso granular

### 2.8 Reportes y Estadísticas

#### 2.8.1 Reporte de Pedidos
- Total de pedidos por período
- Distribución por estado (gráfico)
- Pedidos por preventista
- Pedidos por tipo (presencial/web/teléfono/WhatsApp)
- Ticket promedio
- Valor total de ventas
- Tendencias temporales

#### 2.8.2 Reporte de Entregas
- Entregas completadas vs. fallidas
- Tasa de éxito de entrega (%)
- Motivos de no entrega (gráfico)
- Entregas por zona
- Tiempo promedio de entrega
- Entregas fuera de plazo
- Análisis de eficiencia

#### 2.8.3 Reporte de Rendimiento
- KPIs operativos
- Tiempo promedio de armado
- Tiempo promedio de entrega
- Cumplimiento de plazos (%)
- Productividad por rol
- Comparativas período a período

#### 2.8.4 Reporte Financiero
- **Facturación total**
- **Cobros realizados**
- **Cuenta corriente (saldo total)**
- **Distribución por método de pago:**
  - Efectivo
  - Transferencia
  - Tarjeta
  - Cuenta Corriente
  - Cheque
- Gráficos de ingresos diarios
- Proyección de cobros pendientes
- Análisis de morosidad

#### 2.8.5 Estadísticas de Repartidores
- Entregas por conductor
- Recaudación por conductor
- **Calificación promedio** (rating de clientes)
- Rutas completadas
- Eficiencia (tiempo real vs. estimado)
- Ranking de desempeño

#### 2.8.6 Métricas de Satisfacción
- Rating promedio de pedidos (1-5 estrellas)
- Rating promedio de repartidores (1-5 estrellas)
- Tendencias de satisfacción
- Comentarios de clientes
- Alertas de insatisfacción

**Exportación:** Todos los reportes exportables a PDF y Excel

### 2.9 Registro de Pagos

**Registro manual de pagos:**
- Pagos en efectivo
- Transferencias bancarias
- Tarjeta de débito/crédito
- Cheques
- Otros métodos

**Funcionalidades:**
- Carga de comprobantes (foto/PDF)
- Almacenamiento seguro
- Actualización automática de cuenta corriente
- Descuento del saldo del cliente
- Historial de pagos

### 2.10 Configuración del Sistema

**Configuración del Depósito/Punto Base:**
- Ubicación GPS exacta del depósito
- Mapa interactivo para selección
- Radio de validación (hasta 2km)
- Horarios de operación
- Control de inicio/fin de rutas

---

## 3. MÓDULO PREVENTISTA (VENDEDOR)

### 3.1 Dashboard del Preventista
- Métricas personales:
  - Pedidos de la semana
  - Total de pedidos creados
  - Pendientes de armado
  - Borradores
- Accesos rápidos a funciones principales

### 3.2 Creación de Pedidos

**Formulario Completo de Nuevo Pedido:**

#### 3.2.1 Selección de Cliente
- Búsqueda inteligente (nombre, código, teléfono)
- Vista previa de información
- Aplicación automática de:
  - Descuento general del cliente
  - Restricción horaria (si tiene)
  - Precios según tipo (mayorista/minorista)

#### 3.2.2 Validación GPS para Pedidos Presenciales
**Funcionalidad destacada:**
- Geolocalización en tiempo real del vendedor
- Cálculo de distancia al cliente
- **Validación de radio máximo: configurable por admin (default: 600 metros)**
- Mensajes de error si está fuera de rango
- Opción de cambiar tipo de pedido si no valida

#### 3.2.3 Configuración del Pedido
- Fecha de entrega (mínimo: día siguiente)
- Prioridad: Baja, Normal, Media, Alta, Urgente
- Tipo de pedido:
  - **Presencial** (requiere validación GPS)
  - Web
  - Teléfono
  - WhatsApp

#### 3.2.4 Restricciones Horarias (Time Windows)
- Checkbox para activar
- Hora inicio y fin de ventana
- Se hereda del cliente o se personaliza
- Notas adicionales

#### 3.2.5 Selección de Productos
- Búsqueda inteligente
- Información completa visible:
  - Precios (base, mayorista, minorista)
  - **Stock actual**
  - **Alertas de stock bajo**
  - Unidad de medida

**Soporte para Cantidades Decimales:**
- Productos como carne, granos, líquidos permiten decimales
- Ejemplos: 0.5 kg, 1.75 litros
- Validación según configuración del producto

**Precios Personalizados:**
- Precio sugerido según tipo de cliente
- Permite sobrescribir precio por ítem
- Descuento por ítem (en pesos)

#### 3.2.6 Totales y Descuentos
- **Descuento general del pedido:**
  - En pesos ($) o porcentaje (%)
  - Toggle para cambiar tipo
- Cálculo automático de:
  - Subtotal
  - Descuentos totales
  - Total final

#### 3.2.7 Método de Pago
- Efectivo
- Transferencia
- Tarjeta (Débito/Crédito)
- **Cuenta Corriente** (genera deuda automática)
- Cheque
- Otro

#### 3.2.8 Confirmación
- **Guardar como Borrador:** Sin validaciones
- **Confirmar Pedido:**
  - Valida ubicación GPS (solo presenciales)
  - Valida stock (warning, no blocking)
  - Genera número de pedido
  - Estado → PENDIENTE_ARMADO
  - Si es Cuenta Corriente: genera deuda

### 3.3 Gestión de Borradores

- Lista de pedidos en estado BORRADOR
- Acciones disponibles:
  - **Editar:** Continuar editando
  - **Confirmar:** Convertir a pedido real
  - **Eliminar:** Borrar borrador
  - **Duplicar:** Crear nuevo basado en este

### 3.4 Gestión de Clientes

- Ver clientes asignados
- Crear nuevos clientes
- Editar clientes existentes
- Formulario completo con mapa GPS
- Configuración de restricciones horarias

### 3.5 Visualización de Pedidos

- Lista completa de pedidos propios
- Filtros por estado, fecha, cliente
- Búsqueda por número de pedido
- Ver detalles completos
- Seguimiento de estado

---

## 4. MÓDULO REPARTIDOR (DELIVERY)

### 4.1 Dashboard del Repartidor

**Métricas del día:**
- Recaudado hoy
- Entregas completadas
- Rutas finalizadas
- Rutas futuras programadas

**Ruta en Curso (si existe):**
- Tarjeta destacada con:
  - Código de ruta
  - Zona asignada
  - **Barra de progreso visual** (entregados/no entregados/pendientes)
  - Hora de inicio
  - Botón grande "Continuar Ruta"

**Pestañas de Rutas:**
- **Rutas de Hoy:** Pendientes e iniciadas
- **Completadas Hoy:** Finalizadas
- **Rutas Planificadas:** Futuras (con filtro de fecha)

### 4.2 Ejecución de Ruta

**Funcionalidad más completa del sistema**

#### 4.2.1 Inicio de Ruta
**Validaciones automáticas:**
- **Validación GPS:** Debe estar en el depósito (<2km de radio)
- Solicitud de permiso de geolocalización
- Verificación de ruta única (no puede tener dos en curso)
- Cambio de estado a EN_CURSO
- Registro de hora real de inicio

#### 4.2.2 Navegación con Google Maps
**Integración completa:**
- Botón "Abrir en Google Maps"
- URL pre-construida con todos los waypoints
- Orden optimizado de paradas
- Incluye punto de inicio (depot) y regreso

**Rutas Segmentadas (>25 paradas):**
- División automática en tramos
- Botones por segmento (Tramo 1, Tramo 2, etc.)
- URLs de navegación independientes
- Indicador de waypoints por tramo

#### 4.2.3 Lista de Entregas
**Por cada pedido:**
- Orden optimizado
- Nombre del cliente
- Dirección completa
- **Teléfono con botón de llamada directa**
- Monto del pedido
- Productos a entregar
- **Badge de restricción horaria** (si aplica)
- Estado visual:
  - ✅ Entregado (verde)
  - ❌ No entregado (rojo con motivo)
  - ⏳ Pendiente (gris)

#### 4.2.4 Proceso de Entrega

**Al hacer click en "Entregar":**

**OPCIÓN A: Entrega Exitosa**

**1. Foto de Comprobante:**
- Captura desde cámara del dispositivo
- Preview de la foto
- **Obligatoria** (configurable)
- Almacenamiento en Supabase Storage

**2. Nombre de quien recibió:**
- Campo de texto obligatorio
- Validación de persona que recibe

**3. Sistema de Cobro/Pago:**

**Checkbox: "Se cobró al momento de la entrega"**

Si SÍ se cobró:
- **Monto cobrado** (puede ser parcial o total)
- **Método de pago:**
  - **Efectivo**
  - **Transferencia** → Requiere foto de comprobante
  - **Tarjeta de Débito**
  - **Tarjeta de Crédito**
  - **Cuenta Corriente** → Genera deuda
  - **Cheque**
  - **Otro**

**Actualización Automática al Cobrar:**
- Genera movimiento en cuenta corriente del cliente
- Descuenta del saldo pendiente
- Actualiza estado de pago del pedido:
  - PAGADO (si se cobró todo)
  - PAGO_PARCIAL (si fue parcial)
  - PENDIENTE (si no se cobró)
- Guarda comprobante de transferencia (si aplica)

**4. Notas de entrega:** Campo libre para observaciones

**Confirmación de Entrega:**
- Estado del pedido → ENTREGADO
- Guarda foto de entrega
- Guarda datos de pago
- Registra fecha/hora exacta
- Actualiza cuenta corriente (si cobró)

---

**OPCIÓN B: No se pudo Entregar**

**Checkbox: "No se pudo entregar"**

**Motivos predefinidos:**
- Cliente ausente
- Dirección incorrecta
- Cliente rechazó el pedido
- Sin acceso al domicilio
- Comercio cerrado
- Otro (con campo de texto)

**Evidencia:**
- Foto de evidencia (opcional)
- Notas adicionales

**Confirmación de No Entrega:**
- Guarda motivo y notas
- Guarda foto de evidencia
- Estado del pedido → Sigue PENDIENTE_ENTREGA
- Se marca en ruta como "no entregado"
- Admin recibe alerta automática

#### 4.2.5 Resumen de Ruta en Tiempo Real

**Tarjeta siempre visible:**
- Total de paradas
- Entregas completadas
- Pendientes
- No entregadas
- **Dinero total recaudado**
- Distancia total
- Tiempo estimado vs. real

#### 4.2.6 Finalizar Ruta

**Botón "Finalizar Ruta":**
- Solo disponible cuando todas las entregas están gestionadas
- **Validación GPS:** Debe estar de vuelta en el depósito

**Genera Resumen Final:**
- Total de entregas exitosas
- Total de no entregadas (con motivos)
- **Total recaudado desglosado:**
  - Efectivo: $X
  - Transferencias: $Y
  - Tarjetas: $Z
  - Cuenta Corriente: $W
  - Cheques: $V
- Total esperado vs. total cobrado
- Diferencia (faltantes o sobrantes)

**Cierre de Caja Automático:**
- Crea registro en `route_cash_closure`
- Guarda todos los totales calculados
- **Marca como bloqueado (NO EDITABLE)**
- Genera comprobante de cierre imprimible

**Cambio de Estado:**
- Ruta → COMPLETADO
- Pedidos → ENTREGADO (los entregados)
- Registro de hora real de finalización
- Repartidor queda libre para otra ruta

#### 4.2.7 Comprobantes

**Generación de Comprobantes:**
- **PDF de entrega** con:
  - Detalle del pedido
  - Foto de entrega
  - Datos de quien recibió
  - Firma digital del repartidor
- **Descargable**
- **Compartible por WhatsApp**

---

## 5. MÓDULO ARMADO

### 5.1 Dashboard de Armado

**Vista Kanban (3 columnas):**

**Columna 1: Pendientes (PENDIENTE_ARMADO)**
- Ordenados por prioridad y fecha de entrega
- Botón "Empezar a armar"
- Información visible por pedido

**Columna 2: En Proceso (EN_ARMADO)**
- Muestra quién está armando
- Botón "Continuar armado"
- **Sistema de bloqueo:** No permite que dos personas armen el mismo pedido

**Columna 3: Terminados Hoy**
- Pedidos completados en el día
- Vista de solo lectura
- Resumen de lo armado

**Métricas:**
- Pendientes totales
- En proceso
- Completados hoy

### 5.2 Proceso de Armado

**Funcionalidades del Formulario de Armado:**

#### 5.2.1 Sistema de Bloqueo (Locking)
- Al abrir, el pedido se bloquea para ese usuario
- Estado → EN_ARMADO
- Registra `assembled_by` y `assembly_started_at`
- Si otro usuario lo tiene abierto, muestra warning
- Botón "Liberar" para devolver a pendiente

#### 5.2.2 Armado de Productos

**Por cada producto:**
- Nombre y marca
- **Cantidad solicitada** (por el vendedor)
- **Cantidad a armar** (campo editable)
- Precio unitario
- Subtotal calculado

#### 5.2.3 Gestión de Faltantes

**Checkbox "Hay faltante":**
- Se activa si cantidad armada < solicitada

**Motivos de faltante:**
- Sin stock
- Producto dañado
- Producto discontinuado
- Error en el pedido
- Otro (con campo de texto)

**Notas del faltante:** Campo libre para detalles

#### 5.2.4 Descuento Automático de Stock

**Al confirmar armado:**
- Por cada producto armado:
  - **Se descuenta del stock actual**
  - **Se genera movimiento de stock** tipo "order_assembly"
  - Se registra referencia al pedido
  - Usuario responsable
  - Fecha y hora
- Validación de stock disponible (warning si no hay suficiente)

#### 5.2.5 Notas de Armado
- Campo de texto para observaciones generales
- Ejemplos: "Producto X vino dañado", "Sustituido por similar"

#### 5.2.6 Comprobantes

**Botón "Descargar PDF":**
- Genera comprobante con:
  - Detalle de productos armados vs. solicitados
  - Faltantes marcados con motivo
  - Firma del armador

**Botón "Enviar WhatsApp":**
- Mensaje al cliente notificando que el pedido está listo
- Mensaje pre-cargado
- Link directo al chat

#### 5.2.7 Finalizar Armado

**Validaciones:**
- Todos los productos deben tener cantidad definida
- Faltantes deben tener motivo

**Al confirmar:**
- Actualiza `order_items` con cantidades armadas
- Marca `is_shortage = true` para productos con faltante
- Guarda motivos y notas
- **Descuenta stock de cada producto**
- **Recalcula total del pedido** (si hay faltantes, baja el total)
- Actualiza `has_shortages = true` en order (si aplica)
- Estado → PENDIENTE_ENTREGA
- Registra `assembly_completed_at`
- **Desbloquea el pedido**

---

## 6. MÓDULO CLIENTE

### 6.1 Dashboard del Cliente

**Métricas personales:**
- Total de pedidos
- En proceso (armado/preparación)
- En camino (en repartición)
- Entregados

**Alerta de Faltantes:**
- Banner destacado si hay pedidos con faltantes
- Cantidad de pedidos afectados
- Explicación de ajuste de montos
- Link directo a ver pedidos

**Pedidos Recientes:**
- Últimos 5 pedidos
- Estado con badge
- **Badge especial si tiene faltantes**
- Botón "Ver Detalle"

### 6.2 Lista de Pedidos

**Funcionalidades:**
- Lista completa de pedidos del cliente
- Filtros: estado, fechas, **pedidos con faltantes**
- Búsqueda por número de pedido
- Paginación

**Restricción:** Solo ve SUS propios pedidos

### 6.3 Detalle de Pedido

**Información Completa:**
- Número de pedido y estado
- **Indicador de faltantes** (si aplica)
- Fechas de orden, armado y entrega
- Dirección de entrega
- Método de pago
- Total del pedido

**Listado de Productos (3 columnas):**
- **Solicitado:** Lo que pidió
- **Armado:** Lo que se armó realmente
- **Entregado:** Lo que recibió
- **Indicador visual de diferencias**
- Motivo del faltante (si aplica)

**Total Ajustado:**
- Si hay faltantes:
  - Total original
  - Total ajustado
  - Diferencia descontada

**Evidencia de Entrega (si está entregado):**
- **Foto de entrega**
- Nombre de quien recibió
- Fecha y hora exacta
- Firma del repartidor

**Información de Pago:**
- Monto pagado
- Método de pago
- Comprobante de transferencia (si aplica)
- Saldo pendiente

### 6.4 Sistema de Calificaciones

**Disponible solo para pedidos ENTREGADOS**
**Se puede calificar solo UNA VEZ**

**Doble Calificación:**

**A. Calificación del Pedido/Productos:**
- Estrellas de 1 a 5
- Pregunta: "¿Cómo fue la calidad de los productos?"
- Etiquetas de satisfacción
- Campo de comentarios (opcional)

**B. Calificación del Repartidor:**
- Estrellas de 1 a 5 (color diferente)
- Pregunta: "¿Cómo fue el servicio de entrega?"
- Etiquetas de satisfacción
- Campo de comentarios (opcional)

**Almacenamiento:**
- Ambas calificaciones en `order_ratings`
- Timestamp de creación
- **No editable** después de enviar

**Uso de las Calificaciones:**
- Admin ve métricas agregadas
- Reportes de satisfacción
- Ranking de repartidores
- Análisis de calidad

### 6.5 Soporte

**Botón de Soporte por WhatsApp:**
- Botón flotante "¿Necesitas ayuda?"
- Abre WhatsApp con mensaje pre-cargado
- Incluye número de pedido
- Link directo a soporte

---

## 7. SISTEMA DE CUENTA CORRIENTE

**Gestión Financiera Completa**

### 7.1 Estructura de Cuenta Corriente

**Por cada cliente:**
- **Saldo actual** (current_balance)
- **Límite de crédito** configurable
- **Crédito disponible** (límite - saldo)
- **Días de crédito** permitidos

### 7.2 Tipos de Movimientos

**Débitos (aumentan deuda):**
- DEUDA_PEDIDO: Pedido con cuenta corriente
- AJUSTE_DEBITO: Ajuste manual en contra

**Créditos (reducen deuda):**
- PAGO_EFECTIVO
- PAGO_TRANSFERENCIA
- PAGO_TARJETA
- PAGO_CHEQUE
- PAGO_ADELANTADO
- AJUSTE_CREDITO
- NOTA_CREDITO

### 7.3 Registro de Movimientos

**Cada movimiento registra:**
- Tipo de movimiento
- Descripción
- Monto débito o crédito
- **Saldo después del movimiento** (balance_after)
- Referencia a pedido (si aplica)
- Referencia a ruta (si aplica)
- Usuario responsable
- Comprobante adjunto (si aplica)
- Fecha y hora exacta
- Notas adicionales

### 7.4 Generación Automática de Deuda

**Al crear pedido con método "Cuenta Corriente":**
- Se genera movimiento DEUDA_PEDIDO
- Se suma al saldo del cliente
- Se valida límite de crédito (warning o bloqueo)

**Al entregar sin cobrar o con cobro parcial:**
- Se genera movimiento con diferencia
- Se actualiza saldo automáticamente

### 7.5 Registro de Pagos

**Desde Admin (manual):**
- Registro de pagos recibidos fuera de entrega
- Carga de comprobante (foto/PDF)
- Almacenamiento seguro
- Actualización automática de saldo

**Desde Repartidor (al entregar):**
- Si cobra al entregar
- Genera movimiento automático
- Descuenta del saldo
- Actualiza estado de pago del pedido

### 7.6 Estado de Pago del Pedido

**Estados:**
- **PENDIENTE:** No pagado
- **PAGO_PARCIAL:** Pagado parcialmente
- **PAGADO:** Pagado totalmente
- **VENCIDO:** Pendiente y fecha pasada

**Cálculo automático:**
- Fecha de vencimiento = fecha_entrega + credit_days
- Marcado automático de vencidos (cron job)

### 7.7 Visualización

**Para Admin:**
- Vista completa de cuenta corriente por cliente
- Historial de movimientos
- Pedidos con deuda
- Saldo y crédito disponible
- Alertas de vencimientos

**Para Cliente:**
- Solo ve su propio saldo
- Historial de sus movimientos
- Comprobantes de pago

---

## 8. INTEGRACIONES EXTERNAS

### 8.1 Google Maps API

**Servicios Utilizados:**

**Geocoding API:**
- Conversión de direcciones a coordenadas GPS
- Validación de ubicaciones

**Maps JavaScript API:**
- Mapas interactivos en formularios
- Selección de ubicación por click
- Arrastrar y soltar marcadores
- Geolocalización automática

**Directions API (vía microservicio):**
- Cálculo de rutas optimizadas
- Múltiples waypoints
- Distancia y duración
- URLs de navegación

**Funcionalidades Implementadas:**
- Mapa interactivo para selección de ubicación de clientes
- Validación de distancia (pedidos presenciales)
- Generación de rutas optimizadas
- Navegación en tiempo real
- Validación de ubicación de repartidores (inicio/fin de ruta)

### 8.2 Microservicio de Rutas Inteligentes

**URL:** https://v0-micro-saa-s-snowy.vercel.app

**Funcionalidades:**

**Optimización TSP/VRP:**
- Algoritmo de optimización de rutas
- Orden óptimo de visitas
- Minimización de distancia y tiempo

**VRPTW v2.0:**
- Restricciones horarias (Time Windows)
- Cálculo de tiempos de espera
- Validación de factibilidad
- Tiempo de servicio por parada

**Segmentación de Rutas:**
- División automática de rutas >25 waypoints
- URLs de Google Maps por segmento
- Orden optimizado mantenido

**Cálculo de Costos:**
- Consumo de combustible
- Costo de combustible
- Horas de trabajo
- Costo de mano de obra
- Costo total de ruta

### 8.3 Supabase (Backend as a Service)

**Servicios Utilizados:**

**Authentication:**
- Sistema de usuarios con email/password
- Sesiones con JWT
- Control de acceso basado en roles

**Database (PostgreSQL):**
- 20+ tablas principales
- Relaciones complejas
- Migraciones versionadas
- Row Level Security (RLS)

**Storage:**
- Almacenamiento de archivos:
  - Fotos de entrega
  - Comprobantes de pago
  - Evidencia de no entrega
  - Comprobantes de armado

**Realtime (opcional):**
- Actualización en tiempo real
- Notificaciones push

### 8.4 WhatsApp Business

**Integración vía Deep Links (wa.me):**

**Funcionalidades:**
- Soporte al cliente desde detalle de pedido
- Notificación de armado completado
- Compartir comprobantes de entrega
- Mensajes pre-cargados con contexto
- Apertura directa de chat

**No requiere API oficial** - Usa URLs estándar

---

## 9. CARACTERÍSTICAS TÉCNICAS DESTACADAS

### 9.1 Geolocalización y Validación GPS

**HTML5 Geolocation API:**
- Solicitud de permisos
- Alta precisión
- Manejo de errores

**Cálculo de Distancias:**
- Fórmula de Haversine
- Precisión de metros
- Validaciones configurables

**Validaciones GPS:**
- **Pedidos presenciales:** Vendedor a distancia configurable del cliente (default: 600m)
- **Inicio de ruta:** Repartidor en depósito (<2km)
- **Fin de ruta:** Repartidor de vuelta en depósito

### 9.2 Sistema de Bloqueo Concurrente

**Para Armado:**
- Evita que dos personas armen el mismo pedido
- Bloqueo automático al abrir
- Indicador visual de quién lo tiene
- Opción de liberar manualmente

### 9.3 Soporte para Cantidades Decimales

**Productos con unidades fraccionarias:**
- Configuración por producto
- Validación en formularios
- Ejemplos: 0.5 kg, 1.75 litros, 2.3 metros
- Cálculos precisos con 2 decimales

### 9.4 Sistema de Prioridades

**5 niveles de prioridad:**
- Baja
- Normal
- Media
- Alta
- Urgente

**Aplicación:**
- Ordenamiento de listas
- Indicadores visuales (colores)
- Aumento automático en reprogramaciones

### 9.5 Restricciones Horarias (VRPTW)

**Time Windows por Cliente o Pedido:**
- Hora inicio (ej: 08:00)
- Hora fin (ej: 12:00)
- Notas adicionales

**Consideradas en:**
- Generación de rutas optimizadas
- Cálculo de tiempos de espera
- Validación de factibilidad

### 9.6 Evidencia Fotográfica

**Captura desde Dispositivo:**
- Cámara nativa del móvil
- Preview antes de confirmar
- Compresión automática
- Validación de formato y tamaño

**Almacenamiento Seguro:**
- Supabase Storage
- URLs privadas con autenticación
- Borrado en cascada

**Tipos:**
- Foto de entrega (obligatoria)
- Comprobante de pago/transferencia
- Evidencia de no entrega

### 9.7 Cierre de Caja Inmutable

**Generación Automática:**
- Al finalizar ruta
- Cálculo de todos los totales
- Desglose por método de pago

**Inmutabilidad:**
- Marcado como bloqueado
- **NO puede ser editado** después de creado
- Auditoría completa
- Comprobante imprimible

### 9.8 Auditoría Completa

**Registros de Auditoría:**

**Historial de Pedidos:**
- Todos los cambios de estado
- Cambios de fecha
- Cambios de prioridad
- Usuario responsable
- Motivo del cambio

**Movimientos de Stock:**
- Todos los cambios de inventario
- Stock anterior y nuevo
- Usuario responsable
- Tipo de movimiento
- Referencia (pedido, compra, etc.)

**Movimientos de Cuenta Corriente:**
- Todos los débitos y créditos
- Saldo acumulado
- Usuario responsable
- Comprobantes adjuntos

---

## 10. SEGURIDAD

### 10.1 Autenticación
- Email y contraseña
- Tokens JWT
- Sesiones persistentes
- Cookies httpOnly

### 10.2 Autorización

**RBAC (Role-Based Access Control):**
- 5 roles diferenciados
- Permisos granulares por módulo
- Validación en servidor y cliente
- Redirección automática según rol

### 10.3 Protección de Datos

**Row Level Security (RLS):**
- Políticas a nivel de base de datos
- Usuarios solo ven sus datos
- Clientes solo ven sus pedidos
- Preventistas solo ven sus clientes

**Validaciones:**
- Sanitización de inputs
- Validación de formatos
- Protección contra SQL injection
- Límites de tamaño de archivos

### 10.4 Audit Trail

**Trazabilidad completa:**
- Quién hizo qué
- Cuándo lo hizo
- Por qué (motivos registrados)
- Referencias cruzadas

---

## 11. TECNOLOGÍAS UTILIZADAS

### Frontend
- **Next.js 16** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **Shadcn/ui** (componentes)

### Backend
- **Next.js API Routes**
- **Supabase** (PostgreSQL)
- **Supabase Auth**
- **Supabase Storage**

### Integraciones
- **Google Maps API**
- **Microservicio de Rutas** (Vercel)
- **WhatsApp Business** (Deep Links)

### Deployment
- **Vercel** (Frontend + API)
- **Supabase Cloud** (Database)
- **PWA** (Instalable en móviles)

---

## 12. RESUMEN DE FUNCIONALIDADES PRINCIPALES

### ✅ Gestión Completa de Pedidos
- Creación, edición, cancelación
- Borradores
- Estados múltiples
- Historial de cambios
- Tracking en tiempo real

### ✅ Optimización de Rutas con IA
- Algoritmo VRPTW v2.0
- Restricciones horarias
- Cálculo de costos
- Segmentación automática
- Navegación GPS

### ✅ Control de Inventario
- Stock en tiempo real
- Alertas de stock bajo
- Auditoría completa de movimientos
- Importación masiva CSV
- Edición inline

### ✅ Cuenta Corriente de Clientes
- Saldo en tiempo real
- Historial de movimientos
- Múltiples métodos de pago
- Límites de crédito
- Control de vencimientos

### ✅ Gestión de Entregas
- Evidencia fotográfica
- Validación GPS
- Cobro en el momento
- Comprobantes digitales
- Sistema de no entregas

### ✅ Armado de Pedidos
- Sistema de bloqueo
- Gestión de faltantes
- Descuento automático de stock
- Comprobantes
- Notificaciones

### ✅ Sistema de Calificaciones
- Rating de productos
- Rating de repartidores
- Comentarios
- Métricas de satisfacción

### ✅ Reportes y Analytics
- Reportes financieros
- Reportes operativos
- Estadísticas de rendimiento
- Exportación PDF/Excel
- Gráficos interactivos

### ✅ Seguridad y Auditoría
- Control de acceso por roles
- Trazabilidad completa
- Almacenamiento seguro
- Validaciones múltiples

---

## 13. BENEFICIOS DEL SISTEMA

### Para la Empresa
- **Reducción de costos operativos** (optimización de rutas)
- **Control total de inventario** (auditoría completa)
- **Gestión financiera** (cuenta corriente)
- **Métricas en tiempo real** (toma de decisiones)
- **Trazabilidad completa** (auditoría)
- **Automatización** (menos errores manuales)

### Para Vendedores
- **Validación GPS** (pedidos presenciales verificados)
- **Gestión de clientes** (base de datos completa)
- **Borradores** (flexibilidad)
- **Aplicación automática de precios**
- **Control de stock** (visibilidad inmediata)

### Para Armadores
- **Sistema de bloqueo** (sin duplicación de esfuerzos)
- **Gestión de faltantes** (proceso claro)
- **Descuento automático de stock**
- **Notificaciones automáticas**

### Para Repartidores
- **Rutas optimizadas** (menos km y tiempo)
- **Navegación integrada** (Google Maps)
- **Cobro simplificado** (múltiples métodos)
- **Evidencia fotográfica** (protección legal)
- **Cierre de caja automático** (sin errores)

### Para Clientes
- **Seguimiento en tiempo real**
- **Transparencia** (fotos de entrega)
- **Calificaciones** (voz del cliente)
- **Notificaciones** (WhatsApp)
- **Portal de consulta** (24/7)

---

## 14. SOPORTE Y MANTENIMIENTO

### Actualizaciones
- Base de datos versionada (migraciones)
- Actualizaciones sin downtime
- Rollback automático en caso de error

### Escalabilidad
- Arquitectura cloud-native
- Escalamiento horizontal
- Optimización de queries
- Caching inteligente

### Respaldos
- Backups automáticos diarios
- Retención de 30 días
- Restauración point-in-time

---

**DOCUMENTO CONFIDENCIAL**
*Este documento describe las funcionalidades del sistema de gestión de distribución y entregas desarrollado. Todos los derechos reservados.*
