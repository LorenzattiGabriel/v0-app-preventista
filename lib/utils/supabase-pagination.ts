/**
 * PostgREST corta la respuesta en 1000 filas cuando la query no pide un rango
 * explícito (`max-rows` del proyecto). Cualquier reporte que sume/cuente sobre
 * una tabla que puede superar esa cantidad (orders, customer_account_movements,
 * etc.) necesita paginar o termina contando solo las primeras 1000 filas sin
 * ningún error visible — el bug típico es "el total da bajo" sin que nadie
 * note por qué.
 *
 * Uso:
 *   const orders = await fetchAllRows(({ from, to }) =>
 *     supabase.from("orders").select("total, status").gte("created_at", x).range(from, to)
 *   )
 */
const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  queryBuilder: (range: { from: number; to: number }) => PromiseLike<{ data: T[] | null; error: any }>,
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await queryBuilder({ from, to: from + PAGE_SIZE - 1 })
    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}
