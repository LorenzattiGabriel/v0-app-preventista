// Solo la parte del portal de clientes que es segura para el bundle del
// browser (sin service role key). lib/services/clientPortalService.ts
// reusa esta misma función para el lado servidor.

/** Email interno, determinístico a partir del código del cliente. Nunca se le muestra al cliente. */
export function synthEmailForCustomerCode(customerCode: string): string {
  const slug = customerCode.toLowerCase().replace(/[^a-z0-9]/g, "")
  return `cliente-${slug}@portal.interno`
}
