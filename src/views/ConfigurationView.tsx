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
  PlusIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  normalizeDeviceProducers,
  saveDeviceProducers,
  useDeviceProducers,
} from "@/features/DeviceProducers/producers"
import {
  normalizeServiceSteps,
  saveServiceSteps,
  useServiceSteps,
} from "@/features/ServiceSteps/serviceSteps"
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
  const configuredProducers = useDeviceProducers()
  const configuredSteps = useServiceSteps()
  const [order, setOrder] = useState(configuredOrder)
  const [producers, setProducers] = useState(configuredProducers)
  const [steps, setSteps] = useState(configuredSteps)
  const [newProducer, setNewProducer] = useState("")
  const [newStep, setNewStep] = useState("")
  const [saving, setSaving] = useState(false)
  const [savingProducers, setSavingProducers] = useState(false)
  const [savingSteps, setSavingSteps] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const statusDirty = order.some((status, index) => status !== configuredOrder[index])
  const producersDirty =
    JSON.stringify(normalizeDeviceProducers(producers)) !==
    JSON.stringify(normalizeDeviceProducers(configuredProducers))
  const stepsDirty =
    JSON.stringify(normalizeServiceSteps(steps)) !==
    JSON.stringify(normalizeServiceSteps(configuredSteps))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    setOrder(configuredOrder)
  }, [configuredOrder])

  useEffect(() => {
    setProducers(configuredProducers)
  }, [configuredProducers])

  useEffect(() => {
    setSteps(configuredSteps)
  }, [configuredSteps])

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

  function addProducer() {
    const producer = newProducer.trim()
    if (!producer) return

    setSaved(false)
    setProducers((current) => [...current, producer])
    setNewProducer("")
  }

  async function handleSaveProducers() {
    setSavingProducers(true)
    setError(null)
    setSaved(false)

    try {
      const savedProducers = await saveDeviceProducers(producers)
      setProducers(savedProducers)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać producentów urządzeń."
      )
    } finally {
      setSavingProducers(false)
    }
  }

  function addStep() {
    const step = newStep.trim()
    if (!step) return

    setSaved(false)
    setSteps((current) => [...current, step])
    setNewStep("")
  }

  async function handleSaveSteps() {
    setSavingSteps(true)
    setError(null)
    setSaved(false)

    try {
      const savedSteps = await saveServiceSteps(steps)
      setSteps(savedSteps)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Nie udało się zapisać kroków serwisowych."
      )
    } finally {
      setSavingSteps(false)
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
          Konfiguracja została zapisana.
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
          {statusDirty && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              <CircleAlertIcon className="size-4 shrink-0" />
              Zmieniono kolejność statusów. Zapisz tę sekcję.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving || !statusDirty}>
              {saving && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
              {saving ? "Zapisywanie…" : "Zapisz kolejność"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">Producenci urządzeń</CardTitle>
          <CardDescription>
            Lista jest dostępna w polu producenta podczas tworzenia i edycji zlecenia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <Input
              value={newProducer}
              onChange={(event) => setNewProducer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                addProducer()
              }}
              placeholder="Np. Nivona"
              aria-label="Nowy producent"
            />
            <Button type="button" variant="outline" size="icon" onClick={addProducer} aria-label="Dodaj producenta">
              <PlusIcon />
            </Button>
          </div>
          <div className="divide-y overflow-hidden rounded-lg border">
            {producers.length ? (
              producers.map((producer, index) => (
                <div key={`${producer}-${index}`} className="flex items-center gap-2 p-2">
                  <Input
                    value={producer}
                    onChange={(event) => {
                      setSaved(false)
                      setProducers((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item
                        )
                      )
                    }}
                    aria-label={`Producent ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setSaved(false)
                      setProducers((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }}
                    aria-label={`Usuń producenta ${producer}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))
            ) : (
              <p className="p-3 text-sm text-muted-foreground">Nie dodano producentów.</p>
            )}
          </div>
          {producersDirty && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              <CircleAlertIcon className="size-4 shrink-0" />
              Zmieniono producentów urządzeń. Zapisz tę sekcję.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void handleSaveProducers()} disabled={savingProducers || !producersDirty}>
              {savingProducers && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
              {savingProducers ? "Zapisywanie…" : "Zapisz producentów"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-base">Kroki serwisowe</CardTitle>
          <CardDescription>
            Lista jest dostępna przy krokach naprawy na zleceniu i karcie naprawy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <Input
              value={newStep}
              onChange={(event) => setNewStep(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                addStep()
              }}
              placeholder="Np. Wymiana uszczelki"
              autoComplete="off"
              aria-label="Nowy krok serwisowy"
            />
            <Button type="button" variant="outline" size="icon" onClick={addStep} aria-label="Dodaj krok serwisowy">
              <PlusIcon />
            </Button>
          </div>
          <div className="divide-y overflow-hidden rounded-lg border">
            {steps.length ? (
              steps.map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-center gap-2 p-2">
                  <Input
                    value={step}
                    autoComplete="off"
                    onChange={(event) => {
                      setSaved(false)
                      setSteps((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item
                        )
                      )
                    }}
                    aria-label={`Krok serwisowy ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setSaved(false)
                      setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }}
                    aria-label={`Usuń krok serwisowy ${step}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))
            ) : (
              <p className="p-3 text-sm text-muted-foreground">Nie dodano kroków serwisowych.</p>
            )}
          </div>
          {stepsDirty && (
            <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              <CircleAlertIcon className="size-4 shrink-0" />
              Zmieniono kroki serwisowe. Zapisz tę sekcję.
            </div>
          )}
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void handleSaveSteps()} disabled={savingSteps || !stepsDirty}>
              {savingSteps && <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />}
              {savingSteps ? "Zapisywanie…" : "Zapisz kroki"}
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
