"use client"

// Gráfico de tendencia mensual de venta directa: ventas (barras) y
// facturación (línea), últimos 6 meses. Cliente porque recharts no es
// SSR-friendly.

import { Bar, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

interface Props {
  data: Array<{ month: string; sales: number; revenue: number }>
}

export function VentaDirectaTrendChart({ data }: Props) {
  const hasData = data.some((d) => d.sales > 0 || d.revenue > 0)

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Sin ventas directas en los últimos 6 meses.
      </p>
    )
  }

  const maxSales = Math.max(...data.map((d) => d.sales), 1)
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="month" />
          <YAxis
            yAxisId="left"
            domain={[0, Math.ceil(maxSales * 1.2)]}
            label={{ value: "Ventas", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, Math.ceil(maxRevenue * 1.2)]}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            label={{ value: "Facturación", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
          />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === "Facturación"
                ? `$${v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : v
            }
          />
          <Legend />
          <Bar yAxisId="left" dataKey="sales" fill="#3b82f6" name="Ventas" radius={[4, 4, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            stroke="#22c55e"
            strokeWidth={3}
            name="Facturación"
            dot={{ fill: "#22c55e", r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
