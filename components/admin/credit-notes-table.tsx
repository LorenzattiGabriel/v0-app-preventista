"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Search } from "lucide-react"
import { downloadCreditNote } from "@/lib/credit-note-generator"
import type { CreditNoteResolution } from "@/lib/types/database"

interface CreditNoteRow {
  id: string
  credit_note_number: string
  created_at: string
  resolution_type: CreditNoteResolution
  affects_account: boolean
  amount: number
  reason: string
  invoice_type?: "A" | "B" | "C" | null
  customer?: { commercial_name?: string; street?: string; street_number?: string; locality?: string; province?: string; phone?: string }
  order?: { order_number?: string } | null
  items?: any[]
}

const RESOLUTION_LABELS: Record<CreditNoteResolution, string> = {
  reemplazo: "Reemplazo",
  saldo_favor: "Saldo a favor",
  devolucion_dinero: "Devolución $",
}

const RESOLUTION_VARIANT: Record<CreditNoteResolution, "default" | "secondary" | "outline"> = {
  reemplazo: "secondary",
  saldo_favor: "default",
  devolucion_dinero: "outline",
}

const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

export function CreditNotesTable({ creditNotes }: { creditNotes: CreditNoteRow[] }) {
  const [search, setSearch] = useState("")
  const [resolution, setResolution] = useState<string>("all")

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return creditNotes.filter((cn) => {
      if (resolution !== "all" && cn.resolution_type !== resolution) return false
      if (!q) return true
      const haystack = [
        cn.credit_note_number,
        cn.customer?.commercial_name,
        cn.order?.order_number,
        cn.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [creditNotes, search, resolution])

  const handleDownload = async (cn: CreditNoteRow) => {
    try {
      await downloadCreditNote({
        ...(cn as any),
        customer: cn.customer || {},
        order_number: cn.order?.order_number ?? null,
        items: cn.items || [],
      })
    } catch (err) {
      console.error("Error al descargar PDF:", err)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N°, cliente, pedido o motivo..."
            className="pl-9"
          />
        </div>
        <Select value={resolution} onValueChange={setResolution}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las resoluciones</SelectItem>
            <SelectItem value="reemplazo">Reemplazo</SelectItem>
            <SelectItem value="saldo_favor">Saldo a favor</SelectItem>
            <SelectItem value="devolucion_dinero">Devolución de dinero</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Resolución</TableHead>
              <TableHead>Cuenta cte.</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No hay notas de crédito que coincidan.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((cn) => (
                <TableRow key={cn.id}>
                  <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                  <TableCell className="text-sm">{new Date(cn.created_at).toLocaleDateString("es-AR")}</TableCell>
                  <TableCell className="text-sm">{cn.customer?.commercial_name || "—"}</TableCell>
                  <TableCell className="text-sm">{cn.order?.order_number || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={RESOLUTION_VARIANT[cn.resolution_type]} className="text-xs">
                      {RESOLUTION_LABELS[cn.resolution_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {cn.affects_account ? (
                      <span className="text-green-600 dark:text-green-400">Impacta</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmt(cn.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(cn)} title="Descargar PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{visible.length} nota(s) de crédito</p>
    </div>
  )
}
