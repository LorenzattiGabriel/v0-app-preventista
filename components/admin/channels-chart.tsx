"use client"

// Gráfico de línea: facturación diaria por canal.
// Cliente porque recharts no es SSR-friendly.

import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface Props {
  series: Array<{ date: string; preventista: number; ventaDirecta: number }>
}

export function ChannelsChart({ series }: Props) {
  if (series.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin datos en el rango seleccionado.
      </p>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })
            }
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(v: number) =>
              `$${v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            }
            labelFormatter={(d: string) =>
              new Date(d).toLocaleDateString("es-AR")
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="preventista"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Preventista"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ventaDirecta"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            name="Venta directa"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
