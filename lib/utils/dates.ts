// Helpers de fecha en zona horaria local del runtime.
// Why: new Date().toISOString() formatea en UTC, lo que en Argentina (UTC-3)
// después de las 21hs ya muestra el día siguiente y rompe filtros tipo
// "hoy" / "mañana".

const pad = (n: number) => String(n).padStart(2, "0")

const formatLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const getLocalDateString = (date: Date = new Date()): string =>
  formatLocal(date)

export const getLocalTomorrowDateString = (): string => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatLocal(d)
}

// Formatea cualquier Date como YYYY-MM-DD en zona horaria local.
// Alias semántico de getLocalDateString para cuando se pasa un Date arbitrario
// (no "hoy"), p.ej. startOfMonth, endDate de un rango, etc.
export const formatDateLocal = (date: Date): string => formatLocal(date)
