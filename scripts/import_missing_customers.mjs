/**
 * Script para importar clientes faltantes del Excel a la BD
 * Incluye geocodificación de direcciones
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim();
  });
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Normalizar texto para comparación
const normalize = (str) => {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Geocodificar dirección usando Nominatim (OpenStreetMap)
async function geocodeAddress(address, locality, province) {
  const fullAddress = [address, locality, province, 'Argentina'].filter(Boolean).join(', ');
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PreventistApp/1.0 (contact@example.com)'
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    // Intentar solo con localidad y provincia
    if (locality) {
      const simpleAddress = [locality, province, 'Argentina'].filter(Boolean).join(', ');
      const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simpleAddress)}&limit=1`;
      
      const response2 = await fetch(url2, {
        headers: {
          'User-Agent': 'PreventistApp/1.0 (contact@example.com)'
        }
      });
      
      if (response2.ok) {
        const data2 = await response2.json();
        if (data2 && data2.length > 0) {
          return {
            latitude: parseFloat(data2[0].lat),
            longitude: parseFloat(data2[0].lon)
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('  Error geocoding:', error.message);
    return null;
  }
}

// Mapear condición fiscal
function mapIvaCondition(condFiscal) {
  const map = {
    'CF': 'consumidor_final',
    'RI': 'responsable_inscripto',
    'MT': 'monotributista',
    'EX': 'exento',
    'MTE': 'monotributo_social'
  };
  return map[condFiscal] || 'consumidor_final';
}

// Escapar string para SQL
function escapeSql(str) {
  if (!str) return 'NULL';
  return "'" + str.toString().replace(/'/g, "''") + "'";
}

// Generar código de cliente único
function generateCustomerCode(index) {
  return 'CLI-' + String(index).padStart(5, '0');
}

async function main() {
  console.log('📂 Leyendo archivo Excel...');
  
  const workbook = XLSX.readFile(join(__dirname, '..', 'excel', 'listado_clientes (11) (1).xlsx'));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelRows = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`   → ${excelRows.length} clientes en Excel`);
  
  console.log('\n📦 Obteniendo clientes de la BD...');
  
  const { data: dbCustomers, error } = await supabase
    .from('customers')
    .select('id, code, commercial_name, tax_id');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`   → ${dbCustomers.length} clientes en BD`);
  
  // Obtener zonas
  const { data: zones } = await supabase.from('zones').select('id, name');
  const zoneMap = new Map(zones?.map(z => [normalize(z.name), z.id]) || []);
  
  // Crear mapas para comparación
  const dbByName = new Map();
  const dbByTaxId = new Map();
  
  for (const c of dbCustomers) {
    if (c.commercial_name) dbByName.set(normalize(c.commercial_name), c);
    if (c.tax_id) dbByTaxId.set(c.tax_id.replace(/[^0-9]/g, ''), c);
  }
  
  // Encontrar clientes faltantes
  const missingCustomers = [];
  
  for (const row of excelRows) {
    const razonSocial = row['Razón Social'] || '';
    const nombre = row['Nombre'] || '';
    const cuit = (row['Número'] || '').toString().replace(/[^0-9]/g, '');
    
    let found = false;
    
    if (cuit && cuit.length >= 7 && dbByTaxId.has(cuit)) found = true;
    if (!found && razonSocial && dbByName.has(normalize(razonSocial))) found = true;
    if (!found && nombre && dbByName.has(normalize(nombre))) found = true;
    
    if (!found) {
      missingCustomers.push(row);
    }
  }
  
  console.log(`\n🆕 Clientes faltantes a importar: ${missingCustomers.length}`);
  
  if (missingCustomers.length === 0) {
    console.log('✅ No hay clientes que importar.');
    return;
  }
  
  // Obtener el último código de cliente
  const lastCode = dbCustomers
    .map(c => parseInt(c.code?.replace('CLI-', '') || '0'))
    .sort((a, b) => b - a)[0] || 0;
  
  let codeIndex = lastCode + 1;
  
  console.log('\n🌍 Geocodificando direcciones (esto puede tomar varios minutos)...');
  console.log('   Nominatim tiene un límite de 1 solicitud por segundo.');
  console.log('');
  
  const customersToInsert = [];
  let geocoded = 0;
  let failed = 0;
  
  for (let i = 0; i < missingCustomers.length; i++) {
    const row = missingCustomers[i];
    
    const commercialName = row['Razón Social'] || row['Nombre'] || 'Cliente ' + (i + 1);
    const contactName = row['Nombre'] || '';
    const address = row['Domicilio'] || '';
    const locality = row['Localidad'] || '';
    const province = row['Provincia'] || 'Córdoba';
    
    // Mostrar progreso cada 10 clientes
    if (i % 10 === 0) {
      console.log(`   Procesando ${i + 1}/${missingCustomers.length}: ${commercialName.substring(0, 40)}...`);
    }
    
    // Geocodificar
    let coords = null;
    if (locality) {
      coords = await geocodeAddress(address, locality, province);
      
      // Rate limiting - esperar 1.1 segundos entre solicitudes
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      if (coords) {
        geocoded++;
      } else {
        failed++;
      }
    }
    
    // Buscar zona
    let zoneId = null;
    const zoneName = row['Zona'] || '';
    if (zoneName && zoneMap.has(normalize(zoneName))) {
      zoneId = zoneMap.get(normalize(zoneName));
    }
    
    // Parsear dirección
    const streetParts = address.split(/\s+(?=\d)/);
    const street = streetParts[0] || address;
    const streetNumber = streetParts[1] || '';
    
    customersToInsert.push({
      code: generateCustomerCode(codeIndex++),
      commercial_name: commercialName,
      contact_name: contactName,
      legal_name: row['Razón Social'] || null,
      tax_id: row['Número'] ? row['Número'].toString() : null,
      phone: row['Celular'] || row['Teléfono'] || null,
      email: row['eMail'] || null,
      street: street,
      street_number: streetNumber,
      locality: locality,
      province: province,
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null,
      iva_condition: mapIvaCondition(row['Cond. Fiscal']),
      credit_limit: parseFloat(row['Límite Cta.']) || 0,
      observations: row['Observaciones'] || null,
      zone_id: zoneId,
      customer_type: 'minorista',
      priority: 'normal',
      credit_days: 0,
      general_discount: 0,
      is_active: true,
      has_time_restriction: false,
      current_balance: 0
    });
  }
  
  console.log(`\n📊 Resultado geocodificación:`);
  console.log(`   ✅ Geocodificados: ${geocoded}`);
  console.log(`   ❌ Sin coordenadas: ${failed}`);
  
  // Generar SQL
  console.log('\n📝 Generando script SQL...');
  
  let sql = `-- Script para importar clientes faltantes
-- Generado: ${new Date().toISOString()}
-- Total clientes a insertar: ${customersToInsert.length}
-- Geocodificados: ${geocoded}
-- Sin coordenadas: ${failed}

BEGIN;

`;

  for (const c of customersToInsert) {
    sql += `INSERT INTO customers (
  code, commercial_name, contact_name, legal_name, tax_id,
  phone, email, street, street_number, locality, province,
  latitude, longitude, iva_condition, credit_limit, observations,
  zone_id, customer_type, priority, credit_days, general_discount,
  is_active, has_time_restriction, current_balance
) VALUES (
  ${escapeSql(c.code)}, ${escapeSql(c.commercial_name)}, ${escapeSql(c.contact_name)}, ${escapeSql(c.legal_name)}, ${escapeSql(c.tax_id)},
  ${escapeSql(c.phone)}, ${escapeSql(c.email)}, ${escapeSql(c.street)}, ${escapeSql(c.street_number)}, ${escapeSql(c.locality)}, ${escapeSql(c.province)},
  ${c.latitude || 'NULL'}, ${c.longitude || 'NULL'}, ${escapeSql(c.iva_condition)}, ${c.credit_limit}, ${escapeSql(c.observations)},
  ${c.zone_id ? escapeSql(c.zone_id) : 'NULL'}, ${escapeSql(c.customer_type)}, ${escapeSql(c.priority)}, ${c.credit_days}, ${c.general_discount},
  ${c.is_active}, ${c.has_time_restriction}, ${c.current_balance}
);

`;
  }

  sql += `-- Verificar inserción
SELECT COUNT(*) as clientes_insertados FROM customers WHERE code LIKE 'CLI-%';

-- Cambiar a COMMIT; para confirmar los cambios
ROLLBACK;
`;

  const outputPath = join(__dirname, 'insert_missing_customers.sql');
  writeFileSync(outputPath, sql, 'utf-8');
  
  console.log(`\n✅ Script guardado en: scripts/insert_missing_customers.sql`);
  console.log(`   Total clientes a insertar: ${customersToInsert.length}`);
  
  // También guardar un JSON con los datos para referencia
  const jsonPath = join(__dirname, 'missing_customers_data.json');
  writeFileSync(jsonPath, JSON.stringify(customersToInsert, null, 2), 'utf-8');
  console.log(`   Datos JSON guardados en: scripts/missing_customers_data.json`);
}

main().catch(console.error);





