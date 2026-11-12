"use client"

// Gráfico de barras: esperado vs cobrado por mes, últimos 6 meses.
// Cliente porque recharts no es SSR-friendly.

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface Props {
  data: Array<{ month: string; expected: number; collected: number }>
}

const fmtMoney = (v: number) =>
  `$${v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export function DeliveryBalanceChart({ data }: Props) {
  const hasData = data.some((d) => d.expected > 0 || d.collected > 0)

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Sin cierres de caja en los últimos 6 meses.
      </p>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => fmtMoney(v)} />
          <Legend />
          <Bar dataKey="expected" fill="#94a3b8" name="Esperado" radius={[4, 4, 0, 0]} />
          <Bar dataKey="collected" fill="#22c55e" name="Cobrado" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
