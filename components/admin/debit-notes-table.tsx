"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Download, Search } from "lucide-react"
import { downloadDebitNote } from "@/lib/debit-note-generator"

interface DebitNoteRow {
  id: string
  debit_note_number: string
  created_at: string
  amount: number
  reason: string
  customer?: { commercial_name?: string; street?: string; street_number?: string; locality?: string; province?: string; phone?: string }
  order?: { order_number?: string } | null
}

const fmt = (n: number) => `$${(Number(n) || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`

export function DebitNotesTable({ debitNotes }: { debitNotes: DebitNoteRow[] }) {
  const [search, setSearch] = useState("")

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return debitNotes
    return debitNotes.filter((dn) => {
      const haystack = [dn.debit_note_number, dn.customer?.commercial_name, dn.order?.order_number, dn.reason]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [debitNotes, search])

  const handleDownload = async (dn: DebitNoteRow) => {
    try {
      await downloadDebitNote({
        ...(dn as any),
        customer: dn.customer || {},
        order_number: dn.order?.order_number ?? null,
      })
    } catch (err) {
      console.error("Error al descargar PDF:", err)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por N°, cliente, pedido o motivo..."
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay notas de débito que coincidan.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((dn) => (
                <TableRow key={dn.id}>
                  <TableCell className="font-medium">{dn.debit_note_number}</TableCell>
                  <TableCell className="text-sm">{new Date(dn.created_at).toLocaleDateString("es-AR")}</TableCell>
                  <TableCell className="text-sm">{dn.customer?.commercial_name || "—"}</TableCell>
                  <TableCell className="text-sm">{dn.order?.order_number || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[260px] truncate" title={dn.reason}>{dn.reason}</TableCell>
                  <TableCell className="text-right font-medium text-red-600 dark:text-red-400">{fmt(dn.amount)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(dn)} title="Descargar PDF">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{visible.length} nota(s) de débito</p>
    </div>
  )
}
