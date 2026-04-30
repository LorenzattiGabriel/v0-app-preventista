"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PaginatedOrdersList } from "./paginated-orders-list"
import { Pin, Inbox, Loader2, CheckCircle } from "lucide-react"

type TabKey = "assignedToMe" | "unassigned" | "inProgress" | "finished"

interface DashboardTabsProps {
  assignedToMe: any[]
  unassigned: any[]
  inProgress: any[]
  finished: any[]
  userId: string
}

export function DashboardTabs({
  assignedToMe,
  unassigned,
  inProgress,
  finished,
  userId,
}: DashboardTabsProps) {
  const [tab, setTab] = useState<TabKey>(
    assignedToMe.length > 0
      ? "assignedToMe"
      : unassigned.length > 0
        ? "unassigned"
        : inProgress.length > 0
          ? "inProgress"
          : "assignedToMe",
  )

  const stats: {
    key: TabKey
    label: string
    sublabel: string
    count: number
    icon: typeof Pin
    activeClass: string
  }[] = [
    {
      key: "assignedToMe",
      label: "Asignados a mí",
      sublabel: "Tu cola personal",
      count: assignedToMe.length,
      icon: Pin,
      activeClass: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      key: "unassigned",
      label: "Sin asignar",
      sublabel: "Disponibles para tomar",
      count: unassigned.length,
      icon: Inbox,
      activeClass: "border-purple-500 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      key: "inProgress",
      label: "En proceso",
      sublabel: "Armando ahora",
      count: inProgress.length,
      icon: Loader2,
      activeClass: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      key: "finished",
      label: "Terminados hoy",
      sublabel: "Finalizados hoy",
      count: finished.length,
      icon: CheckCircle,
      activeClass: "border-green-500 bg-green-50 dark:bg-green-950/30",
    },
  ]

  return (
    <div className="space-y-4">
      {/* Cards-stats clickeables: actúan como botones de filtro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon
          const isActive = tab === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setTab(s.key)}
              className={`text-left rounded-lg border p-3 transition-colors hover:border-primary/50 ${
                isActive ? s.activeClass : "border-border bg-background"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{s.sublabel}</span>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-end justify-between gap-2">
                <span className="text-sm font-medium truncate">{s.label}</span>
                <span className="text-2xl font-bold tabular-nums">{s.count}</span>
              </div>
            </button>
          )
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
      <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto gap-1">
        <TabsTrigger value="assignedToMe" className="flex items-center gap-1.5 py-2">
          <Pin className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Asignados a mí</span>
          <span className="sm:hidden">Míos</span>
          <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
            {assignedToMe.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="unassigned" className="flex items-center gap-1.5 py-2">
          <Inbox className="h-3.5 w-3.5" />
          <span>Sin asignar</span>
          <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
            {unassigned.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="inProgress" className="flex items-center gap-1.5 py-2">
          <Loader2 className="h-3.5 w-3.5" />
          <span>En proceso</span>
          <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
            {inProgress.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="finished" className="flex items-center gap-1.5 py-2">
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Terminados hoy</span>
          <span className="sm:hidden">Terminados</span>
          <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
            {finished.length}
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="assignedToMe" className="mt-4">
        <PaginatedOrdersList
          orders={assignedToMe}
          userId={userId}
          itemsPerPage={10}
          title="📌 Asignados a mí"
          emptyMessage="No tenés pedidos asignados"
          variant="pending"
        />
      </TabsContent>

      <TabsContent value="unassigned" className="mt-4">
        <PaginatedOrdersList
          orders={unassigned}
          userId={userId}
          itemsPerPage={10}
          title="Sin asignar"
          emptyMessage="No hay pedidos sin asignar"
          variant="pending"
        />
      </TabsContent>

      <TabsContent value="inProgress" className="mt-4">
        <PaginatedOrdersList
          orders={inProgress}
          userId={userId}
          itemsPerPage={10}
          title="En Proceso"
          emptyMessage="No hay pedidos en proceso"
          variant="inProgress"
        />
      </TabsContent>

      <TabsContent value="finished" className="mt-4">
        <PaginatedOrdersList
          orders={finished}
          userId={userId}
          itemsPerPage={10}
          title="Terminados Hoy"
          emptyMessage="Ningún pedido terminado hoy"
          variant="finished"
        />
      </TabsContent>
    </Tabs>
    </div>
  )
}
