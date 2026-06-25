import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createFinancialMovementsService,
  type FinancialMovementsFilters,
} from "@/lib/services/financialMovementsService"
import { getLocalDateString } from "@/lib/utils/dates"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "administrativo") {
    return { error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) }
  }
  return { supabase, user }
}

const CONCEPT_LABELS: Record<string, string> = {
  DEUDA_PEDIDO: "Deuda de pedido",
  PAGO_EFECTIVO: "Pago efectivo",
  PAGO_TRANSFERENCIA: "Pago transferencia",
  PAGO_TARJETA: "Pago tarjeta",
  PAGO_CHEQUE: "Pago cheque",
  PAGO_CUENTA_CORRIENTE: "Pago cta. corriente",
  PAGO_OTRO: "Pago (otro)",
  AJUSTE_CREDITO: "Ajuste a favor",
  AJUSTE_DEBITO: "Ajuste en contra",
  NOTA_CREDITO: "Nota de crédito",
  PAGO_ADELANTADO: "Pago adelantado",
}

const CHANNEL_LABELS: Record<string, string> = {
  ruta: "Cobro en ruta",
  fuera_ruta: "Fuera de ruta",
  proveedor: "Proveedor",
}

/** Escapa un valor para CSV (comillas, comas, saltos de línea). */
function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const url = new URL(request.url)
  const p = url.searchParams
  const filters: FinancialMovementsFilters = {
    search: p.get("search") || undefined,
    partyId: p.get("partyId") || undefined,
    routeId: p.get("routeId") || undefined,
    source: (p.get("source") as FinancialMovementsFilters["source"]) || undefined,
    direction: (p.get("direction") as FinancialMovementsFilters["direction"]) || undefined,
    channel: (p.get("channel") as FinancialMovementsFilters["channel"]) || undefined,
    paymentMethod: p.get("paymentMethod") || undefined,
    dateFrom: p.get("dateFrom") || undefined,
    dateTo: p.get("dateTo") || undefined,
  }

  const service = createFinancialMovementsService(auth.supabase)

  // Traemos hasta 10k filas del filtro (paginando la vista) para el export.
  const PAGE_SIZE = 1000
  const MAX_ROWS = 10000
  const all: any[] = []
  let page = 1
  while (all.length < MAX_ROWS) {
    const { rows } = await service.listMovements(filters, page, PAGE_SIZE)
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    page++
  }

  const headers = [
    "Fecha",
    "Tipo",
    "Quién",
    "Código",
    "Concepto",
    "Descripción",
    "Canal",
    "Reparto",
    "Método",
    "Ingreso",
    "Egreso",
    "Pedido",
    "Notas",
  ]

  const lines = [headers.join(",")]
  for (const m of all) {
    const isIngreso = m.direction === "ingreso"
    lines.push(
      [
        csvCell(new Date(m.date).toLocaleString("es-AR")),
        csvCell(m.party_type === "cliente" ? "Cliente" : "Proveedor"),
        csvCell(m.party_name),
        csvCell(m.party_code),
        csvCell(CONCEPT_LABELS[m.concept || ""] || m.concept),
        csvCell(m.description),
        csvCell(CHANNEL_LABELS[m.channel] || m.channel),
        csvCell(m.route_code),
        csvCell(m.payment_method),
        csvCell(isIngreso ? m.amount : ""),
        csvCell(!isIngreso ? m.amount : ""),
        csvCell(m.order_number),
        csvCell(m.notes),
      ].join(","),
    )
  }

  // BOM para que Excel respete los acentos (UTF-8)
  const body = "﻿" + lines.join("\n")
  const filename = `movimientos-financieros-${getLocalDateString()}.csv`

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
