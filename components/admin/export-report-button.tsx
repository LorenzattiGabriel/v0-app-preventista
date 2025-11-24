"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ExportReportButtonProps {
  reportType: "orders" | "financial"
  data: any
  startDate: Date
  endDate: Date
}

export function ExportReportButton({ reportType, data, startDate, endDate }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Import jsPDF dynamically to avoid SSR issues
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      // Title
      doc.setFontSize(20)
      doc.text(reportType === "orders" ? "Reporte de Pedidos" : "Reporte Financiero", 20, y)

      y += 10
      doc.setFontSize(12)
      doc.setTextColor(100)
      doc.text(
        `Período: ${format(startDate, "dd/MM/yyyy", { locale: es })} - ${format(endDate, "dd/MM/yyyy", { locale: es })}`,
        20,
        y
      )

      doc.setTextColor(0)
      y += 15

      if (reportType === "orders") {
        // Orders Report
        const { stats, ordersByStatus } = data

        // Stats section
        doc.setFontSize(14)
        doc.text("Estadísticas Generales", 20, y)
        y += 10

        doc.setFontSize(10)
        doc.text(`Total de Pedidos: ${stats.totalOrders.toLocaleString()}`, 20, y)
        y += 7
        doc.text(`Pedidos Completados: ${stats.completedOrders.toLocaleString()}`, 20, y)
        y += 7
        doc.text(`Pedidos Pendientes: ${stats.pendingOrders.toLocaleString()}`, 20, y)
        y += 7
        doc.text(`Pedidos Cancelados: ${stats.cancelledOrders.toLocaleString()}`, 20, y)
        y += 7
        doc.text(
          `Valor Promedio: $${stats.avgOrderValue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          20,
          y
        )
        y += 7
        doc.text(
          `Facturación Total: $${stats.totalRevenue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          20,
          y
        )

        y += 15

        // Status distribution
        doc.setFontSize(14)
        doc.text("Distribución por Estado", 20, y)
        y += 10

        doc.setFontSize(10)
        ordersByStatus.forEach((item: any) => {
          doc.text(`${item.status}: ${item.count} (${item.percentage.toFixed(1)}%)`, 20, y)
          y += 7
          if (y > 270) {
            doc.addPage()
            y = 20
          }
        })
      } else if (reportType === "financial") {
        // Financial Report
        const { stats, revenueByZone, paymentMethods } = data

        // Stats section
        doc.setFontSize(14)
        doc.text("Estadísticas Financieras", 20, y)
        y += 10

        doc.setFontSize(10)
        doc.text(
          `Facturación Total: $${(stats.totalRevenue / 1000000).toFixed(2)}M`,
          20,
          y
        )
        y += 7
        doc.text(
          `Cobrado: $${(stats.collected / 1000000).toFixed(2)}M (${((stats.collected / stats.totalRevenue) * 100).toFixed(1)}%)`,
          20,
          y
        )
        y += 7
        doc.text(
          `Pendiente: $${(stats.pending / 1000000).toFixed(2)}M (${((stats.pending / stats.totalRevenue) * 100).toFixed(1)}%)`,
          20,
          y
        )
        y += 7
        doc.text(
          `Ticket Promedio: $${stats.avgTicket.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          20,
          y
        )

        y += 15

        // Revenue by zone
        if (revenueByZone && revenueByZone.length > 0) {
          doc.setFontSize(14)
          doc.text("Facturación por Zona", 20, y)
          y += 10

          doc.setFontSize(10)
          revenueByZone.forEach((item: any) => {
            doc.text(
              `${item.zone}: $${(item.revenue / 1000000).toFixed(2)}M`,
              20,
              y
            )
            y += 7
            if (y > 270) {
              doc.addPage()
              y = 20
            }
          })

          y += 10
        }

        // Payment methods
        if (paymentMethods && paymentMethods.length > 0) {
          doc.setFontSize(14)
          doc.text("Métodos de Pago", 20, y)
          y += 10

          doc.setFontSize(10)
          paymentMethods.forEach((item: any) => {
            doc.text(
              `${item.method}: $${(item.amount / 1000000).toFixed(2)}M (${item.percentage.toFixed(1)}%)`,
              20,
              y
            )
            y += 7
            if (y > 270) {
              doc.addPage()
              y = 20
            }
          })
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        )
      }

      // Save the PDF
      const fileName = `reporte-${reportType}-${format(startDate, "yyyyMMdd")}-${format(endDate, "yyyyMMdd")}.pdf`
      doc.save(fileName)
    } catch (error) {
      console.error("Error exporting report:", error)
      alert("Error al exportar el reporte. Por favor, intente nuevamente.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </>
      )}
    </Button>
  )
}

