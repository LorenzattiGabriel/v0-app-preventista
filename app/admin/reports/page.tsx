import { Suspense } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrdersReport } from "@/components/admin/orders-report"
import { DeliveryReport } from "@/components/admin/delivery-report"
import { PerformanceReport } from "@/components/admin/performance-report"
import { FinancialReport } from "@/components/admin/financial-report"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { subMonths, startOfMonth, endOfMonth } from "date-fns"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const params = await searchParams

  // Default to current month if no dates provided
  const fromDate = params.from ? new Date(params.from) : startOfMonth(new Date())
  const toDate = params.to ? new Date(params.to) : endOfMonth(new Date())

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" asChild>
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Reportes y Análisis</h1>
        <p className="text-muted-foreground">Análisis detallado de operaciones y rendimiento del sistema</p>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="delivery">Entregas</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          <TabsTrigger value="financial">Financiero</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <Suspense fallback={<ReportSkeleton />}>
            <OrdersReport startDate={fromDate} endDate={toDate} />
          </Suspense>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-6">
          <Suspense fallback={<ReportSkeleton />}>
            <DeliveryReport />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Suspense fallback={<ReportSkeleton />}>
            <PerformanceReport />
          </Suspense>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <Suspense fallback={<ReportSkeleton />}>
            <FinancialReport startDate={fromDate} endDate={toDate} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
