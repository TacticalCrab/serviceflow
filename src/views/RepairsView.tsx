import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  EyeIcon,
  LoaderCircleIcon,
  SearchIcon,
  WrenchIcon,
  XIcon,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  listServiceRequests,
  updateServiceRequestStatus,
  type ServiceRequest,
  type ServiceStatus,
} from "@/features/ServiceRequests/api"
import { StatusSelect } from "@/features/ServiceRequests/StatusSelect"
import {
  isActiveServiceStatus,
  serviceStatusLabels,
  serviceStatusOptions,
} from "@/features/ServiceRequests/status"

type StatusFilter = ServiceStatus | "active" | "all"

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "active", label: "Wszystkie aktywne" },
  ...serviceStatusOptions.map(({ value, label }) => ({ value, label })),
  { value: "all", label: "Wszystkie statusy" },
]

function formatCreatedAt(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : format(date, "d MMM yyyy, HH:mm", { locale: pl })
}

function formatCost(value: number | undefined) {
  if (value === undefined) return "—"

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(value)
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? "")
    .replace(/[łŁ]/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
}

function searchableDate(value: string | undefined) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return [
    value,
    format(date, "d MMMM yyyy HH:mm", { locale: pl }),
    format(date, "dd.MM.yyyy"),
  ].join(" ")
}

function requestMatchesSearch(request: ServiceRequest, query: string) {
  const searchTokens = normalizeSearchValue(query).trim().split(/\s+/).filter(Boolean)
  if (searchTokens.length === 0) return true

  const preferences = request.client.preferences
  const searchableValues = [
    request.id,
    `#${request.id}`,
    request.client.name,
    request.client.surname,
    request.client.phone,
    request.client.email,
    request.client.address,
    request.device.name,
    request.device.model,
    request.device.defect,
    request.repairTime,
    request.costEstimate,
    formatCost(request.costEstimate),
    ...(request.repairSteps ?? []),
    ...(request.additionalCosts?.flatMap((cost) => [cost.description, cost.price]) ?? []),
    searchableDate(request.createdAt),
    searchableDate(request.statusChangedAt),
    serviceStatusLabels[request.status],
    preferences?.checkIn?.method === "servicePickup"
      ? "odbiór od klienta serwis odbiera"
      : "klient przywozi",
    preferences?.checkOut?.method === "serviceDelivery"
      ? "dostawa do klienta serwis dostarcza"
      : "klient odbiera",
    searchableDate(preferences?.checkIn?.date),
    searchableDate(preferences?.checkOut?.date),
  ]
  const searchIndex = normalizeSearchValue(searchableValues.join(" "))

  return searchTokens.every((token) => searchIndex.includes(token))
}

function RepairsView() {
  const location = useLocation()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<number>>(
    () => new Set()
  )
  const created = Boolean((location.state as { created?: boolean } | null)?.created)
  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          (statusFilter === "all" ||
            (statusFilter === "active"
              ? isActiveServiceStatus(request.status)
              : request.status === statusFilter)) &&
          requestMatchesSearch(request, searchQuery)
      ),
    [requests, searchQuery, statusFilter]
  )

  useEffect(() => {
    let cancelled = false

    listServiceRequests()
      .then((data) => {
        if (!cancelled) setRequests(data)
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            typeof loadError === "string"
              ? loadError
              : "Nie udało się pobrać listy napraw."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleStatusChange(request: ServiceRequest, status: ServiceStatus) {
    if (request.status === status) return

    setError(null)
    setUpdatingStatusIds((current) => new Set(current).add(request.id))
    try {
      const updatedRequest = await updateServiceRequestStatus(request.id, status)
      setRequests((current) =>
        current.map((item) => (item.id === request.id ? updatedRequest : item))
      )
    } catch (statusError) {
      setError(
        typeof statusError === "string"
          ? statusError
          : `Nie udało się zmienić statusu zlecenia #${request.id}.`
      )
    } finally {
      setUpdatingStatusIds((current) => {
        const next = new Set(current)
        next.delete(request.id)
        return next
      })
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Naprawy</h1>
        <p className="text-muted-foreground">Lista zarejestrowanych napraw serwisowych.</p>
      </header>

      {created && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Zlecenie serwisowe zostało zapisane.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Status
          </label>
          <Select
            items={statusFilterOptions}
            value={statusFilter}
            onValueChange={(value) => {
              if (value) setStatusFilter(value as StatusFilter)
            }}
          >
            <SelectTrigger className="h-9 w-64" aria-label="Filtr statusu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              <SelectGroup>
                {statusFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full lg:max-w-md">
          <label htmlFor="service-request-search" className="sr-only">
            Wyszukaj zlecenie serwisowe
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="service-request-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nr zlecenia, klient, telefon, ekspres…"
              className="h-9 pl-9 pr-9"
              autoComplete="off"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1"
                onClick={() => setSearchQuery("")}
                aria-label="Wyczyść wyszukiwanie"
              >
                <XIcon />
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zlecenia serwisowe</CardTitle>
          <CardDescription>
            {loading
              ? "Pobieranie zleceń…"
              : searchQuery.trim()
                ? `${filteredRequests.length} z ${requests.length} zleceń`
                : `${filteredRequests.length} ${filteredRequests.length === 1 ? "zlecenie" : "zleceń"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className={filteredRequests.length > 0 ? "px-0" : undefined}>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Pobieranie napraw…
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <WrenchIcon className="size-5 text-primary" />
              </span>
              <div>
                <p className="font-medium">Brak zleceń</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery.trim()
                    ? "Nie znaleziono zleceń pasujących do wyszukiwania i wybranego statusu."
                    : "Nie ma zleceń o wybranym statusie."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-left text-sm">
                <thead className="border-y bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Zlecenie</th>
                    <th className="px-4 py-3 font-medium">Klient</th>
                    <th className="px-4 py-3 font-medium">Urządzenie</th>
                    <th className="px-4 py-3 font-medium">Wycena</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Utworzono</th>
                    <th className="px-4 py-3 text-right font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">#{request.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {request.client.name} {request.client.surname}
                        </div>
                        {request.client.phone && (
                          <div className="text-xs text-muted-foreground">
                            {request.client.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{request.device.name}</div>
                        {request.device.model && (
                          <div className="text-xs text-muted-foreground">
                            {request.device.model}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatCost(request.costEstimate)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect
                          value={request.status}
                          onValueChange={(status) =>
                            void handleStatusChange(request, status)
                          }
                          disabled={updatingStatusIds.has(request.id)}
                          compact
                          aria-label={`Status zlecenia #${request.id}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatCreatedAt(request.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link to={`/naprawy/${request.id}`} />}
                        >
                          <EyeIcon data-icon="inline-start" />
                          Otwórz
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export { RepairsView }
