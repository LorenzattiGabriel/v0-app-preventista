"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldAlert, ShieldCheck, Search, Landmark, FileWarning } from "lucide-react"
import {
  isValidCuit,
  normalizeCuit,
  SITUACION_LABELS,
  type ChequesRechazadosResult,
  type DeudasResult,
} from "@/lib/services/bcraService"

interface Props {
  /** CUIT/CUIL precargado (ej. el tax_id del cliente). Si se pasa, el input queda oculto. */
  initialCuit?: string
  label?: string
}

type ConsultaTipo = "cheques" | "deudas"

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "clean" }
  | { state: "found-cheques"; data: ChequesRechazadosResult }
  | { state: "found-deudas"; data: DeudasResult }

const ENDPOINT_BY_TIPO: Record<ConsultaTipo, string> = {
  cheques: "/api/admin/bcra/cheques-rechazados",
  deudas: "/api/admin/bcra/deudas",
}

export function BcraChequesCheck({ initialCuit, label }: Props) {
  const [tipo, setTipo] = useState<ConsultaTipo>("cheques")
  const [cuit, setCuit] = useState(initialCuit || "")
  const [result, setResult] = useState<Result>({ state: "idle" })

  const switchTipo = (t: ConsultaTipo) => {
    if (t === tipo) return
    setTipo(t)
    setResult({ state: "idle" })
  }

  const handleCheck = async () => {
    if (!isValidCuit(cuit)) {
      setResult({ state: "error", message: "Ingresá un CUIT/CUIL válido (11 dígitos)" })
      return
    }
    setResult({ state: "loading" })
    try {
      const res = await fetch(`${ENDPOINT_BY_TIPO[tipo]}?cuit=${normalizeCuit(cuit)}`)
      const body = await res.json()
      if (!res.ok) {
        setResult({ state: "error", message: body.error || "Error al consultar el BCRA" })
        return
      }
      if (!body.found) {
        setResult({ state: "clean" })
      } else if (tipo === "cheques") {
        setResult({ state: "found-cheques", data: body.data })
      } else {
        setResult({ state: "found-deudas", data: body.data })
      }
    } catch {
      setResult({ state: "error", message: "No se pudo conectar con el BCRA" })
    }
  }

  const totalCheques =
    result.state === "found-cheques"
      ? result.data.causales.reduce((sum, c) => sum + c.entidades.reduce((s, e) => s + e.detalle.length, 0), 0)
      : 0

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
        <button
          type="button"
          onClick={() => switchTipo("cheques")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            tipo === "cheques" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileWarning className="h-3.5 w-3.5" />
          Cheques Rechazados
        </button>
        <button
          type="button"
          onClick={() => switchTipo("deudas")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            tipo === "deudas" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Landmark className="h-3.5 w-3.5" />
          Situación Crediticia
        </button>
      </div>

      <div className="flex gap-2">
        {!initialCuit && (
          <Input
            placeholder="CUIT/CUIL (11 dígitos)"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            className="max-w-[220px]"
          />
        )}
        <Button variant="outline" onClick={handleCheck} disabled={result.state === "loading"}>
          {result.state === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {label || (tipo === "cheques" ? "Verificar cheques" : "Verificar situación")}
        </Button>
      </div>

      {result.state === "error" && <p className="text-sm text-destructive">{result.message}</p>}

      {result.state === "clean" && (
        <div className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 p-3">
          <ShieldCheck className="h-5 w-5 text-green-700 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-green-700 dark:text-green-400">Sin novedades</p>
            <p className="text-xs text-green-700/80 dark:text-green-400/80">
              {tipo === "cheques"
                ? "No tiene cheques rechazados registrados en el BCRA"
                : "No tiene deuda registrada en la Central de Deudores del BCRA"}
            </p>
          </div>
        </div>
      )}

      {result.state === "found-cheques" && (
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

      {result.state === "found-deudas" && (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <Landmark className="h-4 w-4" />
            Deuda registrada en la Central de Deudores del BCRA
          </div>
          <p className="text-xs text-muted-foreground">{result.data.denominacion}</p>

          {[...result.data.periodos]
            .sort((a, b) => b.periodo.localeCompare(a.periodo))
            .map((periodo) => (
              <div key={periodo.periodo} className="space-y-2">
                <Badge variant="outline" className="font-normal">
                  Período {periodo.periodo.slice(4, 6)}/{periodo.periodo.slice(0, 4)}
                </Badge>
                {periodo.entidades.map((entidad, i) => {
                  const critico = entidad.situacion >= 3
                  return (
                    <div key={i} className="p-2 bg-background rounded border space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{entidad.entidad}</span>
                        <span className="font-semibold">
                          ${Number(entidad.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={critico ? "destructive" : "outline"} className="text-xs font-normal">
                          {SITUACION_LABELS[entidad.situacion] || `Situación ${entidad.situacion}`}
                        </Badge>
                        {entidad.diasAtrasoPago > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {entidad.diasAtrasoPago} días de atraso
                          </span>
                        )}
                        {entidad.procesoJud && (
                          <Badge variant="destructive" className="text-xs font-normal">
                            Proceso judicial
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
