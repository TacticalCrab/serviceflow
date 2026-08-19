import { useCallback, useEffect, useState } from "react"
import {
  Link,
  type BlockerFunction,
  useBeforeUnload,
  useBlocker,
  useNavigate,
  useParams,
} from "react-router"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CircleCheckBigIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PencilIcon,
  RotateCcwIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ServiceForm from "@/features/ServiceForm/ServiceForm"
import type { FormSchema } from "@/features/ServiceForm/schema"
import {
  closeServiceRequest,
  deleteServiceRequest,
  getServiceRequest,
  reopenServiceRequest,
  serviceRequestToFormValues,
  updateServiceRequest,
  updateServiceRequestStatus,
  type ServiceRequest,
  type ServiceStatus,
} from "@/features/ServiceRequests/api"
import { StatusSelect } from "@/features/ServiceRequests/StatusSelect"
import {
  isActiveServiceStatus,
  serviceStatusBadgeClasses,
  serviceStatusLabels,
} from "@/features/ServiceRequests/status"
import { cn } from "@/lib/utils"

const EDIT_FORM_ID = "service-request-edit-form"

const transportLabels: Record<string, string> = {
  clientDropOff: "Klient przywozi sprzęt",
  servicePickup: "Serwis odbiera sprzęt",
  clientPickup: "Klient odbiera sprzęt",
  serviceDelivery: "Serwis dostarcza sprzęt",
}

function formatDate(value: string | undefined, includeTime = false) {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return format(date, includeTime ? "d MMM yyyy, HH:mm" : "d MMMM yyyy", {
    locale: pl,
  })
}

function formatCost(value: number | undefined) {
  if (value === undefined) return "—"

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value)
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  )
}

function RequestDetails({ request }: { request: ServiceRequest }) {
  const preferences = request.client.preferences
  const checkIn = preferences?.checkIn
  const checkOut = preferences?.checkOut

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dane klienta</CardTitle>
          <CardDescription>Kontakt i preferencje obsługi.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem
              label="Klient"
              value={[request.client.name, request.client.surname].filter(Boolean).join(" ")}
            />
            <DetailItem label="Telefon" value={request.client.phone} />
            <DetailItem label="E-mail" value={request.client.email} />
            <DetailItem label="Adres" value={request.client.address} />
            <DetailItem
              label="Karta naprawy"
              value={preferences?.repairCard ? "Tak" : "Nie"}
            />
            <DetailItem label="Faktura" value={preferences?.invoice ? "Tak" : "Nie"} />
          </dl>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Przyjęcie sprzętu</p>
              <p className="text-sm text-muted-foreground">
                {checkIn?.method ? transportLabels[checkIn.method] : "Nie ustalono"}
              </p>
              <p className="mt-1 text-sm">{formatDate(checkIn?.date)}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-sm font-medium">Zwrot sprzętu</p>
              <p className="text-sm text-muted-foreground">
                {checkOut?.method ? transportLabels[checkOut.method] : "Nie ustalono"}
              </p>
              <p className="mt-1 text-sm">{formatDate(checkOut?.date)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Urządzenie</CardTitle>
          <CardDescription>Dane sprzętu przekazanego do serwisu.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <DetailItem label="Nazwa" value={request.device.name} />
            <DetailItem label="Producent" value={request.device.manufacturer} />
            <DetailItem label="Model" value={request.device.model} />
            <DetailItem label="Numer seryjny" value={request.device.serialNumber} />
            <div className="sm:col-span-2">
              <DetailItem label="Opis usterki" value={request.device.defect} />
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Plan naprawy</CardTitle>
          <CardDescription>Zakres prac, terminy i wycena.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid gap-5 sm:grid-cols-3">
            <DetailItem label="Czas naprawy" value={request.repairTime} />
            <DetailItem label="Szacowany koszt" value={formatCost(request.costEstimate)} />
            <DetailItem
              label="Dodatkowe koszty"
              value={formatCost(
                request.additionalCosts?.reduce((sum, cost) => sum + cost.price, 0)
              )}
            />
          </dl>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-medium">Kroki naprawy</h3>
              {request.repairSteps?.length ? (
                <ol className="space-y-2">
                  {request.repairSteps.map((step, index) => (
                    <li key={`${step}-${index}`} className="flex gap-3 rounded-lg bg-muted/40 p-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Nie dodano kroków naprawy.</p>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium">Dodatkowe koszty</h3>
              {request.additionalCosts?.length ? (
                <div className="divide-y rounded-lg border">
                  {request.additionalCosts.map((cost, index) => (
                    <div
                      key={`${cost.description}-${index}`}
                      className="flex items-center justify-between gap-4 p-3 text-sm"
                    >
                      <span>{cost.description}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatCost(cost.price)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nie dodano dodatkowych kosztów.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestDetailsView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const requestId = Number(id)
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closedNotice, setClosedNotice] = useState(false)
  const [reopening, setReopening] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [reopenError, setReopenError] = useState<string | null>(null)
  const [reopenedNotice, setReopenedNotice] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      editing && dirty && currentLocation.pathname !== nextLocation.pathname,
    [dirty, editing]
  )
  const blocker = useBlocker(shouldBlock)

  useBeforeUnload(
    useCallback(
      (event) => {
        if (editing && dirty) {
          event.preventDefault()
          event.returnValue = ""
        }
      },
      [dirty, editing]
    )
  )

  useEffect(() => {
    let cancelled = false

    if (!Number.isInteger(requestId) || requestId <= 0) {
      setLoadError("Nieprawidłowy numer zlecenia.")
      setLoading(false)
      return
    }

    getServiceRequest(requestId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setLoadError(`Nie znaleziono zlecenia #${requestId}.`)
          return
        }
        setRequest(data)
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            typeof error === "string" ? error : "Nie udało się pobrać zlecenia."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestId])

  const handleDirtyChange = useCallback((isDirty: boolean) => {
    setDirty(isDirty)
    if (isDirty) setSaved(false)
  }, [])

  async function handleUpdate(values: FormSchema) {
    if (!request) return

    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updateServiceRequest(request.id, values)
      setRequest(updated)
      setDirty(false)
      setEditing(false)
      setSaved(true)
    } catch (error) {
      setSaveError(
        typeof error === "string"
          ? error
          : "Nie udało się zapisać zmian. Spróbuj ponownie."
      )
      throw error
    } finally {
      setSaving(false)
    }
  }

  async function handleClose() {
    if (!request) return

    setClosing(true)
    setCloseError(null)
    try {
      const closedRequest = await closeServiceRequest(request.id)
      setRequest(closedRequest)
      setSaved(false)
      setReopenedNotice(false)
      setStatusNotice(null)
      setClosedNotice(true)
      setCloseDialogOpen(false)
    } catch (error) {
      setCloseError(
        typeof error === "string"
          ? error
          : "Nie udało się zamknąć zlecenia. Spróbuj ponownie."
      )
    } finally {
      setClosing(false)
    }
  }

  async function handleReopen() {
    if (!request) return

    setReopening(true)
    setReopenError(null)
    try {
      const reopenedRequest = await reopenServiceRequest(request.id)
      setRequest(reopenedRequest)
      setSaved(false)
      setClosedNotice(false)
      setStatusNotice(null)
      setReopenedNotice(true)
      setReopenDialogOpen(false)
    } catch (error) {
      setReopenError(
        typeof error === "string"
          ? error
          : "Nie udało się wznowić zlecenia. Spróbuj ponownie."
      )
    } finally {
      setReopening(false)
    }
  }

  async function handleStatusChange(status: ServiceStatus) {
    if (!request || request.status === status) return

    setStatusUpdating(true)
    setSaveError(null)
    try {
      const updatedRequest = await updateServiceRequestStatus(request.id, status)
      setRequest(updatedRequest)
      setSaved(false)
      setClosedNotice(false)
      setReopenedNotice(false)
      setStatusNotice(`Status zmieniono na „${serviceStatusLabels[status]}”.`)
    } catch (error) {
      setSaveError(
        typeof error === "string"
          ? error
          : "Nie udało się zmienić statusu zlecenia. Spróbuj ponownie."
      )
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleDelete() {
    if (!request) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteServiceRequest(request.id)
      navigate("/naprawy", { replace: true, state: { deleted: true } })
    } catch (error) {
      setDeleteError(
        typeof error === "string"
          ? error
          : "Nie udało się usunąć zlecenia. Spróbuj ponownie."
      )
      setDeleting(false)
    }
  }

  function cancelEditing() {
    if (dirty && !window.confirm("Porzucić niezapisane zmiany?")) return

    setDirty(false)
    setEditing(false)
    setSaveError(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Pobieranie zlecenia…
      </div>
    )
  }

  if (loadError || !request) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>Nie można wyświetlić zlecenia</CardTitle>
          <CardDescription>{loadError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" nativeButton={false} render={<Link to="/naprawy" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            Wróć do napraw
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/naprawy" />}
            className="-ml-2"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Naprawy
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">Zlecenie #{request.id}</h1>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-xs font-medium",
                  serviceStatusBadgeClasses[request.status]
                )}
              >
                {serviceStatusLabels[request.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Utworzono {formatDate(request.createdAt, true)}
            </p>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <StatusSelect
              value={request.status}
              onValueChange={(status) => void handleStatusChange(status)}
              disabled={statusUpdating || closing || reopening}
              className="min-w-56"
              aria-label="Szybka zmiana statusu"
            />
          </div>

          {editing ? (
            <Button type="button" variant="outline" onClick={cancelEditing}>
              Zakończ edycję
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to={`/naprawy/${request.id}/karta-naprawy`} />}
              >
                <FileTextIcon data-icon="inline-start" />
                Karta naprawy
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(true)
                  setSaved(false)
                  setClosedNotice(false)
                  setReopenedNotice(false)
                }}
              >
                <PencilIcon data-icon="inline-start" />
                Edytuj zlecenie
              </Button>
              {isActiveServiceStatus(request.status) && (
                <AlertDialog
                  open={closeDialogOpen}
                  onOpenChange={(open) => {
                    if (closing) return
                    setCloseDialogOpen(open)
                    if (!open) setCloseError(null)
                  }}
                >
                  <AlertDialogTrigger
                    render={<Button type="button" disabled={closing} />}
                  >
                    <CircleCheckBigIcon data-icon="inline-start" />
                    Zamknij zlecenie
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Zamknąć zlecenie?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Zlecenie #{request.id} zostanie oznaczone jako zakończone.
                        Nadal będzie dostępne na liście napraw po wybraniu filtra
                        „Zakończone”.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {closeError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                      >
                        {closeError}
                      </div>
                    )}
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={closing}>Anuluj</AlertDialogCancel>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void handleClose()}
                        disabled={closing}
                      >
                        {closing ? (
                          <LoaderCircleIcon
                            className="animate-spin"
                            data-icon="inline-start"
                          />
                        ) : (
                          <CircleCheckBigIcon data-icon="inline-start" />
                        )}
                        {closing ? "Zamykanie…" : "Zamknij zlecenie"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {request.status === "closed" && (
                <AlertDialog
                  open={reopenDialogOpen}
                  onOpenChange={(open) => {
                    if (reopening) return
                    setReopenDialogOpen(open)
                    if (!open) setReopenError(null)
                  }}
                >
                  <AlertDialogTrigger
                    render={<Button type="button" disabled={reopening} />}
                  >
                    <RotateCcwIcon data-icon="inline-start" />
                    Wznów zlecenie
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Wznowić zlecenie?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Zlecenie #{request.id} ponownie otrzyma status „W naprawie” i
                        pojawi się w domyślnym widoku napraw.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {reopenError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                      >
                        {reopenError}
                      </div>
                    )}
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={reopening}>Anuluj</AlertDialogCancel>
                      <Button
                        type="button"
                        onClick={() => void handleReopen()}
                        disabled={reopening}
                      >
                        {reopening ? (
                          <LoaderCircleIcon
                            className="animate-spin"
                            data-icon="inline-start"
                          />
                        ) : (
                          <RotateCcwIcon data-icon="inline-start" />
                        )}
                        {reopening ? "Wznawianie…" : "Wznów zlecenie"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  if (deleting) return
                  setDeleteDialogOpen(open)
                  if (!open) setDeleteError(null)
                }}
              >
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deleting || statusUpdating}
                    />
                  }
                >
                  <Trash2Icon data-icon="inline-start" />
                  Usuń
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usunąć zlecenie?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Zlecenie #{request.id} oraz wszystkie zapisane w nim dane zostaną
                      trwale usunięte. Tej operacji nie można cofnąć.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      {deleteError}
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Anuluj</AlertDialogCancel>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <LoaderCircleIcon
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : (
                        <Trash2Icon data-icon="inline-start" />
                      )}
                      {deleting ? "Usuwanie…" : "Usuń zlecenie"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </header>

      {saved && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Zmiany zostały zapisane.
        </div>
      )}

      {closedNotice && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Zlecenie zostało zamknięte.
        </div>
      )}

      {reopenedNotice && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Zlecenie zostało wznowione.
        </div>
      )}

      {statusNotice && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          {statusNotice}
        </div>
      )}

      {editing && dirty && (
        <div className="sticky top-20 z-30 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-50 p-3 text-amber-950 shadow-sm dark:bg-amber-950/90 dark:text-amber-100">
          <AlertTriangleIcon className="size-5 shrink-0 text-amber-600" />
          <div className="mr-auto">
            <p className="text-sm font-medium">Masz niezapisane zmiany</p>
            <p className="text-xs opacity-80">Zapisz je przed opuszczeniem tego widoku.</p>
          </div>
          <Button type="submit" form={EDIT_FORM_ID} size="sm" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Zapisywanie…" : "Zapisz zmiany"}
          </Button>
        </div>
      )}

      {saveError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      {editing ? (
        <ServiceForm
          key={request.id}
          formId={EDIT_FORM_ID}
          defaultValues={serviceRequestToFormValues(request)}
          onDirtyChange={handleDirtyChange}
          onSubmit={handleUpdate}
          title={`Edycja zlecenia #${request.id}`}
          description="Zmień dane zlecenia i zapisz je przed opuszczeniem widoku."
          submitLabel="Zapisz zmiany"
        />
      ) : (
        <RequestDetails request={request} />
      )}

      {blocker.state === "blocked" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
          <Card role="dialog" aria-modal="true" className="w-full max-w-md shadow-xl">
            <CardHeader>
              <CardTitle>Niezapisane zmiany</CardTitle>
              <CardDescription>
                Opuszczenie widoku spowoduje utratę wprowadzonych zmian.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => blocker.reset()}>
                Zostań
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setDirty(false)
                  blocker.proceed()
                }}
              >
                Opuść bez zapisywania
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  )
}

export { RequestDetailsView }
