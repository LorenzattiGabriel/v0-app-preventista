"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldAlert, ShieldCheck, Search } from "lucide-react"
import { isValidCuit, normalizeCuit, type ChequesRechazadosResult } from "@/lib/services/bcraService"

interface Props {
  /** CUIT/CUIL precargado (ej. el tax_id del cliente). Si se pasa, el input queda oculto. */
  initialCuit?: string
  label?: string
}

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "clean" }
  | { state: "found"; data: ChequesRechazadosResult }

export function BcraChequesCheck({ initialCuit, label = "Verificar en BCRA" }: Props) {
  const [cuit, setCuit] = useState(initialCuit || "")
  const [result, setResult] = useState<Result>({ state: "idle" })

  const handleCheck = async () => {
    if (!isValidCuit(cuit)) {
      setResult({ state: "error", message: "Ingresá un CUIT/CUIL válido (11 dígitos)" })
      return
    }
    setResult({ state: "loading" })
    try {
      const res = await fetch(`/api/admin/bcra/cheques-rechazados?cuit=${normalizeCuit(cuit)}`)
      const body = await res.json()
      if (!res.ok) {
        setResult({ state: "error", message: body.error || "Error al consultar el BCRA" })
        return
      }
      if (!body.found) {
        setResult({ state: "clean" })
      } else {
        setResult({ state: "found", data: body.data })
      }
    } catch {
      setResult({ state: "error", message: "No se pudo conectar con el BCRA" })
    }
  }

  const totalCheques =
    result.state === "found"
      ? result.data.causales.reduce(
          (sum, c) => sum + c.entidades.reduce((s, e) => s + e.detalle.length, 0),
          0,
        )
      : 0

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {!initialCuit && (
          <Input
            placeholder="CUIT/CUIL (11 dígitos)"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            className="max-w-[220px]"
          />
        )}
        <Button
          variant="outline"
          onClick={handleCheck}
          disabled={result.state === "loading"}
        >
          {result.state === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {label}
        </Button>
      </div>

      {result.state === "error" && (
        <p className="text-sm text-destructive">{result.message}</p>
      )}

      {result.state === "clean" && (
        <div className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 p-3">
          <ShieldCheck className="h-5 w-5 text-green-700 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-700 dark:text-green-400">Sin novedades</p>
            <p className="text-xs text-green-700/80 dark:text-green-400/80">
              No tiene cheques rechazados registrados en el BCRA
            </p>
          </div>
        </div>
      )}

      {result.state === "found" && (
        <div className="space-y-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
            {totalCheques} cheque{totalCheques !== 1 ? "s" : ""} rechazado{totalCheques !== 1 ? "s" : ""} registrado
            {totalCheques !== 1 ? "s" : ""} en el BCRA
          </div>
          <p className="text-xs text-muted-foreground">{result.data.denominacion}</p>

          {result.data.causales.map((causal) => (
            <div key={causal.causal} className="space-y-2">
              <Badge variant="destructive" className="font-normal">
                {causal.causal}
              </Badge>
              {causal.entidades.map((entidad, i) => (
                <div key={i} className="pl-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {(entidad as any).entidadNombre || `Entidad ${entidad.entidad}`}
                  </p>
                  {entidad.detalle.map((cheque) => (
                    <div
                      key={cheque.nroCheque}
                      className="flex items-center justify-between text-xs p-2 bg-background rounded border"
                    >
                      <span>
                        Cheque N° {cheque.nroCheque} · rechazado{" "}
                        {new Date(cheque.fechaRechazo).toLocaleDateString("es-AR")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          ${Number(cheque.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                        {cheque.fechaPago ? (
                          <Badge variant="outline" className="text-green-700 border-green-400">
                            Pagado
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Impago</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
