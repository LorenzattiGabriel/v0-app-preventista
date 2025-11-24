# 📸 Configuración del Bucket "delivery" en Supabase

## ⚠️ IMPORTANTE: Ejecutar ANTES de usar el sistema de fotos

Para que el sistema de evidencia de entrega funcione correctamente, debes configurar el bucket de Supabase Storage.

---

## 1️⃣ Crear el Bucket "delivery"

1. Ir a **Supabase Dashboard** → **Storage**
2. Click en "**New bucket**"
3. Configuración:
   ```
   Name: delivery
   Public: ☑️ Yes (para que las URLs sean accesibles)
   File size limit: 5 MB
   Allowed MIME types: image/jpeg, image/png, image/webp, image/jpg
   ```
4. Click "**Create bucket**"

---

## 2️⃣ Configurar Políticas de Seguridad (RLS)

### Política 1: Permitir que repartidores suban fotos

```sql
-- En Supabase SQL Editor:

CREATE POLICY "Repartidores can upload delivery photos"
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'delivery' 
  AND (auth.jwt() ->> 'role')::text = 'repartidor'
);
```

### Política 2: Permitir que usuarios autenticados vean las fotos

```sql
CREATE POLICY "Authenticated users can view delivery photos"
ON storage.objects 
FOR SELECT
TO authenticated
USING (bucket_id = 'delivery');
```

### Política 3: Permitir acceso público (alternativa más simple)

Si prefieres URLs públicas sin autenticación:

```sql
-- Eliminar políticas anteriores primero
DROP POLICY IF EXISTS "Repartidores can upload delivery photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view delivery photos" ON storage.objects;

-- Crear política pública
CREATE POLICY "Public can view delivery photos"
ON storage.objects 
FOR SELECT
TO public
USING (bucket_id = 'delivery');

CREATE POLICY "Authenticated can upload delivery photos"
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'delivery');
```

---

## 3️⃣ Ejecutar Migración SQL

Ejecutar en **Supabase SQL Editor**:

```bash
supabase/migrations/add_delivery_photo_fields.sql
```

Esta migración:
- ❌ Elimina columna `delivery_code` (ya no se usa)
- ✅ Agrega columna `delivery_photo_url`
- ✅ Agrega columna `received_by_name`
- ✅ Crea índices para búsquedas rápidas

---

## 4️⃣ Verificar Configuración

### Test 1: Verificar Bucket
```sql
SELECT * FROM storage.buckets WHERE id = 'delivery';
```
Debería mostrar:
- `id`: delivery
- `public`: true

### Test 2: Verificar Políticas
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%delivery%';
```
Debería mostrar las 2 políticas creadas.

---

## 📁 Estructura de Archivos en el Bucket

Las fotos se guardarán con el siguiente formato:

```
delivery/
├── <order_id>_<timestamp>.jpg
├── <order_id>_<timestamp>.png
└── <order_id>_<timestamp>.webp
```

Ejemplo:
```
delivery/
├── 12d1429d-27e6-4c0e-a8a6-d0b6d225ddde_1701234567890.jpg
└── 98f3c21a-45b7-4f1e-9a12-8c7d5e3f9a21_1701234568123.png
```

---

## 🔒 Consideraciones de Seguridad

### ✅ Recomendaciones:

1. **Límite de Tamaño**: Máximo 5MB por foto (validado en el código)
2. **Tipos de Archivo**: Solo imágenes (jpeg, png, webp)
3. **Nombres Únicos**: Incluyen order_id y timestamp para evitar conflictos
4. **No Sobreescritura**: `upsert: false` previene sobreescribir fotos existentes
5. **URLs Públicas**: Permiten que clientes vean la evidencia sin autenticación compleja

### ⚠️ Consideraciones:

- Las fotos son permanentes (no se eliminan al cancelar pedido)
- URLs públicas son accesibles por cualquiera con el link
- Si necesitas mayor seguridad, usa políticas RLS más estrictas

---

## 🧪 Test de Funcionamiento

### Desde la Aplicación:

1. **Repartidor**:
   - Inicia ruta
   - Click en "Confirmar Entrega" en un pedido
   - Toma foto usando el input de archivo
   - Ingresa nombre de quien recibe
   - Click "Confirmar Entrega"
   - ✅ Debe subir la foto y cambiar estado a ENTREGADO

2. **Cliente**:
   - Ve su pedido entregado
   - ✅ Debe ver la foto y el nombre de quien recibió

### Desde Supabase Dashboard:

1. Ir a **Storage** → **delivery**
2. ✅ Deberías ver la foto subida
3. Click en la foto → "Copy URL"
4. Pegar URL en navegador
5. ✅ Deberías ver la imagen

---

## 🚨 Troubleshooting

### Error: "Bucket not found"
- Verificar que el bucket "delivery" existe
- Verificar el nombre exacto (case-sensitive)

### Error: "Permission denied"
- Verificar que las políticas RLS están creadas
- Verificar que el usuario está autenticado
- Verificar el role del usuario

### Error: "File too large"
- La foto excede 5MB
- Comprimir la imagen antes de subir

### Error: "Invalid file type"
- Solo se permiten imágenes
- Verificar extensión del archivo

---

## ✅ Checklist de Configuración

- [ ] Bucket "delivery" creado
- [ ] Bucket configurado como público
- [ ] Políticas RLS creadas (upload + view)
- [ ] Migración SQL ejecutada
- [ ] Columnas agregadas a tabla orders
- [ ] Test de subida realizado
- [ ] Test de visualización realizado

---

**Una vez completada esta configuración, el sistema de evidencia de entrega estará 100% funcional.** 🚀

