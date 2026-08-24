import { useEffect, useState } from "react"
import { Link } from "react-router"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  GripVerticalIcon,
  LoaderCircleIcon,
  Settings2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ServiceStatus } from "@/features/ServiceRequests/api"
import {
  serviceStatusDotClasses,
  serviceStatusLabels,
} from "@/features/ServiceRequests/status"
import { saveStatusOrder, useStatusOrder } from "@/features/ServiceRequests/statusOrder"
import { cn } from "@/lib/utils"

function SortableStatus({ status, index }: { status: ServiceStatus; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 bg-background px-3 py-2",
        isDragging && "z-10 rounded-lg border bg-muted shadow-sm opacity-90"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-ml-1 cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Przeciągnij status ${serviceStatusLabels[status]}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon />
      </Button>
      <span className="w-4 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
      <span className={cn("size-3 shrink-0 rounded-full", serviceStatusDotClasses[status])} />
      <span className="font-medium">{serviceStatusLabels[status]}</span>
    </li>
  )
}

function ConfigurationView() {
  const configuredOrder = useStatusOrder()
  const [order, setOrder] = useState(configuredOrder)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setOrder(configuredOrder)
  }, [configuredOrder])

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return

    setSaved(false)
    setOrder((current) => {
      const sourceIndex = current.indexOf(active.id as ServiceStatus)
      const targetIndex = current.indexOf(over.id as ServiceStatus)
      return sourceIndex < 0 || targetIndex < 0
        ? current
        : arrayMove(current, sourceIndex, targetIndex)
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await saveStatusOrder(order)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać kolejności statusów."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Ustawienia</p>
          <h1 className="text-3xl font-semibold tracking-tight">Konfiguracja</h1>
          <p className="max-w-2xl text-muted-foreground">
            Dostosuj sposób działania widoków serwisowych.
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link to="/ustawienia/firma" />}>
          Ustawienia firmy
        </Button>
      </header>

      {saved && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Kolejność statusów została zapisana.
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <Card className="max-w-xl">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">Kolejność statusów</CardTitle>
          <CardDescription>
            Przeciągnij status, aby zmienić jego pozycję w filtrach i selektorach.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ol className="divide-y overflow-hidden rounded-lg border">
                {order.map((status, index) => (
                  <SortableStatus key={status} status={status} index={index} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
              {saving ? "Zapisywanie…" : "Zapisz kolejność"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex items-start gap-3 pt-6 text-sm text-muted-foreground">
          <Settings2Icon className="mt-0.5 size-4 shrink-0" />
          Kolejne ustawienia operacyjne będą dostępne w tym widoku.
        </CardContent>
      </Card>
    </section>
  )
}

export { ConfigurationView }
