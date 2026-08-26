import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router"
import { format, isValid } from "date-fns"
import { pl } from "date-fns/locale"
import {
  CheckCircle2Icon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CircleCheckIcon,
  CircleAlertIcon,
  EyeIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PackageCheckIcon,
  PencilIcon,
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TruckIcon,
  WalletCardsIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
  reopenServiceRequest,
  updateServiceRequestStatus,
  type ServiceRequest,
  type ServiceStatus,
} from "@/features/ServiceRequests/api"
import { StatusSelect } from "@/features/ServiceRequests/StatusSelect"
import {
  isActiveServiceStatus,
  serviceStatusDotClasses,
  serviceStatusLabels,
} from "@/features/ServiceRequests/status"
import { useOrderedServiceStatuses } from "@/features/ServiceRequests/statusOrder"
import { finalPrice, totalAdditionalExpenses } from "@/features/ServiceRequests/pricing"
import { useRepairsTableColumnOrder } from "@/features/ServiceRequests/tableColumnOrder"
import { cn } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/phone"

type StatusFilter = ServiceStatus | "active" | "all"
type SortDirection = "desc" | "asc" | null
type TableColumnId =
  | "customer"
  | "phone"
  | "device"
  | "manufacturer"
  | "model"
  | "serialNumber"
  | "defect"
  | "repairTime"
  | "estimate"
  | "additionalCosts"
  | "profit"
  | "status"
  | "checkIn"
  | "checkOut"
  | "repairCard"
  | "invoice"
  | "createdAt"
  | "statusChangedAt"
type SortColumn = "id" | TableColumnId
type ViewPreset = "compact" | "schedule" | "financial" | "intake" | "workshop" | "returns"

const tableColumnOptions: Array<{ id: TableColumnId; label: string }> = [
  { id: "customer", label: "Klient" },
  { id: "phone", label: "Telefon" },
  { id: "device", label: "Urządzenie" },
  { id: "manufacturer", label: "Producent" },
  { id: "model", label: "Model" },
  { id: "serialNumber", label: "Numer seryjny" },
  { id: "defect", label: "Opis usterki" },
  { id: "repairTime", label: "Czas naprawy" },
  { id: "estimate", label: "Kwota końcowa" },
  { id: "additionalCosts", label: "Wydatki" },
  { id: "profit", label: "Zysk" },
  { id: "status", label: "Status" },
  { id: "checkIn", label: "Przyjęcie sprzętu" },
  { id: "checkOut", label: "Zwrot sprzętu" },
  { id: "repairCard", label: "Karta naprawy" },
  { id: "invoice", label: "Faktura" },
  { id: "createdAt", label: "Data utworzenia" },
  { id: "statusChangedAt", label: "Zmiana statusu" },
]

const COLUMN_VISIBILITY_STORAGE_KEY = "cafe-service.repairs-table-columns-v2"
const STATUS_FILTER_STORAGE_KEY = "cafe-service.repairs-status-filter"
const TABLE_SORT_STORAGE_KEY = "cafe-service.repairs-table-sort"
const VIEW_PRESET_STORAGE_KEY = "cafe-service.repairs-table-view-preset"
const SEARCH_QUERY_STORAGE_KEY = "cafe-service.repairs-search-query"

const defaultColumnVisibility: Record<TableColumnId, boolean> = {
  customer: true,
  phone: false,
  device: true,
  manufacturer: false,
  model: false,
  serialNumber: false,
  defect: true,
  repairTime: false,
  estimate: true,
  additionalCosts: false,
  profit: false,
  status: true,
  checkIn: true,
  checkOut: true,
  repairCard: false,
  invoice: false,
  createdAt: false,
  statusChangedAt: false,
}

const viewPresetColumns: Record<ViewPreset, TableColumnId[]> = {
  compact: ["status", "customer", "device", "estimate"],
  schedule: ["status", "customer", "device", "checkIn", "checkOut"],
  financial: ["status", "customer", "device", "estimate", "additionalCosts", "profit"],
  intake: ["status", "customer", "phone", "device", "checkIn"],
  workshop: ["status", "customer", "device", "defect", "repairTime", "checkOut", "createdAt"],
  returns: ["status", "customer", "phone", "device", "checkOut", "repairCard", "invoice"],
}

const viewPresetStatus: Record<ViewPreset, StatusFilter> = {
  compact: "active",
  schedule: "active",
  financial: "closed",
  intake: "waiting_for_device",
  workshop: "in_repair",
  returns: "ready_for_return",
}

const viewPresetSort: Record<
  ViewPreset,
  { column: SortColumn; direction: Exclude<SortDirection, null> }
> = {
  compact: { column: "id", direction: "desc" },
  schedule: { column: "checkIn", direction: "asc" },
  financial: { column: "estimate", direction: "desc" },
  intake: { column: "checkIn", direction: "asc" },
  workshop: { column: "createdAt", direction: "asc" },
  returns: { column: "checkOut", direction: "asc" },
}

function isViewPreset(value: unknown): value is ViewPreset {
  return value === "compact" || value === "schedule" || value === "financial" || value === "intake" || value === "workshop" || value === "returns"
}

function columnVisibilityForPreset(preset: ViewPreset): Record<TableColumnId, boolean> {
  const presetColumns = viewPresetColumns[preset]
  return tableColumnOptions.reduce(
    (columns, column) => ({ ...columns, [column.id]: presetColumns.includes(column.id) }),
    {} as Record<TableColumnId, boolean>
  )
}

function loadColumnVisibility(): Record<TableColumnId, boolean> {
  try {
    const savedValue = window.localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY)
    if (!savedValue) return defaultColumnVisibility

    const savedColumns = JSON.parse(savedValue) as Partial<Record<TableColumnId, unknown>>
    return tableColumnOptions.reduce(
      (columns, column) => ({
        ...columns,
        [column.id]:
          typeof savedColumns[column.id] === "boolean"
            ? savedColumns[column.id]
            : defaultColumnVisibility[column.id],
      }),
      {} as Record<TableColumnId, boolean>
    )
  } catch {
    return defaultColumnVisibility
  }
}

function loadStatusFilter(): StatusFilter {
  try {
    const savedValue = window.localStorage.getItem(STATUS_FILTER_STORAGE_KEY)
    if (savedValue === "active" || savedValue === "all") return savedValue

    return savedValue && savedValue in serviceStatusLabels
      ? (savedValue as ServiceStatus)
      : "active"
  } catch {
    return "active"
  }
}

function loadTableSort(): { column: SortColumn | null; direction: SortDirection } {
  try {
    const savedValue = window.localStorage.getItem(TABLE_SORT_STORAGE_KEY)
    if (!savedValue) return { column: null, direction: null }

    const savedSort = JSON.parse(savedValue) as { column?: unknown; direction?: unknown }
    const isKnownColumn =
      savedSort.column === "id" ||
      tableColumnOptions.some((column) => column.id === savedSort.column)
    const isKnownDirection = savedSort.direction === "asc" || savedSort.direction === "desc"

    return isKnownColumn && isKnownDirection
      ? { column: savedSort.column as SortColumn, direction: savedSort.direction as SortDirection }
      : { column: null, direction: null }
  } catch {
    return { column: null, direction: null }
  }
}

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

function transportDetails(
  request: ServiceRequest,
  direction: "checkIn" | "checkOut"
) {
  const transport = request.client.preferences?.[direction]
  if (!transport?.method) return { label: "Nie ustalono" }

  const label =
    transport.method === "servicePickup"
      ? "Odbiór serwisu"
      : transport.method === "serviceDelivery"
        ? "Dostawa serwisu"
        : transport.method === "clientDropOff"
          ? "Klient przywozi"
          : "Klient odbiera"
  const date = transport.date ? new Date(transport.date) : undefined

  return {
    label,
    date: date && isValid(date) ? date : undefined,
  }
}

function TransportCell({
  request,
  direction,
}: {
  request: ServiceRequest
  direction: "checkIn" | "checkOut"
}) {
  const transport = transportDetails(request, direction)

  return (
    <div className="min-w-36 leading-snug">
      <div className="font-medium text-foreground">{transport.label}</div>
      {transport.date && (
        <div className="mt-1 text-xs text-muted-foreground">
          {format(transport.date, "d MMM yyyy", { locale: pl })}
        </div>
      )}
    </div>
  )
}

function additionalCostsTotal(request: ServiceRequest) {
  const costs = request.additionalCosts ?? []
  if (!costs.length) return "—"

  return formatCost(totalAdditionalExpenses(costs))
}

function sortableValue(
  request: ServiceRequest,
  column: SortColumn,
  statusOrder: ServiceStatus[]
) {
  switch (column) {
    case "id":
      return request.id
    case "customer":
      return [request.client.name, request.client.surname].filter(Boolean).join(" ")
    case "phone":
      return request.client.phone ?? ""
    case "device":
      return request.device.name
    case "manufacturer":
      return request.device.manufacturer ?? ""
    case "model":
      return request.device.model ?? ""
    case "serialNumber":
      return request.device.serialNumber ?? ""
    case "defect":
      return request.device.defect ?? ""
    case "repairTime":
      return request.repairTime ?? ""
    case "estimate":
      return finalPrice(request.costEstimate, request.additionalCosts) ?? -1
    case "additionalCosts":
      return totalAdditionalExpenses(request.additionalCosts)
    case "profit":
      return (finalPrice(request.costEstimate, request.additionalCosts) ?? 0) - totalAdditionalExpenses(request.additionalCosts)
    case "status":
      return statusOrder.indexOf(request.status)
    case "checkIn":
      return transportDetails(request, "checkIn").date?.getTime() ?? Number.MAX_SAFE_INTEGER
    case "checkOut":
      return transportDetails(request, "checkOut").date?.getTime() ?? Number.MAX_SAFE_INTEGER
    case "repairCard":
      return request.client.preferences?.repairCard ? 1 : 0
    case "invoice":
      return request.client.preferences?.invoice ? 1 : 0
    case "createdAt":
      return request.createdAt
    case "statusChangedAt":
      return request.statusChangedAt
  }
}

function SortableColumnHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string
  column: SortColumn
  activeColumn: SortColumn | null
  direction: SortDirection
  onSort: (column: SortColumn) => void
}) {
  const isActive = activeColumn === column && direction !== null
  const Icon = isActive ? (direction === "asc" ? ChevronUpIcon : ChevronDownIcon) : ChevronsUpDownIcon

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-auto px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
      onClick={() => onSort(column)}
      aria-label={`Sortuj według: ${label}`}
    >
      {label}
      <Icon className={isActive ? "opacity-100" : "opacity-45"} />
    </Button>
  )
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
    request.device.manufacturer,
    request.device.model,
    request.device.serialNumber,
    request.device.defect,
    request.repairTime,
    request.costEstimate,
    formatCost(request.costEstimate),
    finalPrice(request.costEstimate, request.additionalCosts),
    formatCost(finalPrice(request.costEstimate, request.additionalCosts)),
    (finalPrice(request.costEstimate, request.additionalCosts) ?? 0) - totalAdditionalExpenses(request.additionalCosts),
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
    preferences?.repairCard ? "karta naprawy" : "",
    preferences?.invoice ? "faktura" : "",
  ]
  const searchIndex = normalizeSearchValue(searchableValues.join(" "))

  return searchTokens.every((token) => searchIndex.includes(token))
}

function RepairsView() {
  const location = useLocation()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(loadStatusFilter)
  const [searchQuery, setSearchQuery] = useState(() =>
    window.sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY) ?? ""
  )
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(() =>
    window.sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY) ?? ""
  )
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(() => loadTableSort().column)
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => loadTableSort().direction)
  const [temporaryPreset, setTemporaryPreset] = useState<ViewPreset | null>(null)
  const [visibleColumns, setVisibleColumns] = useState(loadColumnVisibility)
  const persistedColumnOrder = useRepairsTableColumnOrder()
  const columnOrder = temporaryPreset
    ? [...viewPresetColumns[temporaryPreset], ...persistedColumnOrder.filter((column) => !viewPresetColumns[temporaryPreset].includes(column))]
    : persistedColumnOrder
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<number>>(
    () => new Set()
  )
  const orderedStatusOptions = useOrderedServiceStatuses()
  const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "Wszystkie Statusy" },
    { value: "active", label: "Wszystkie Aktywne" },
    ...orderedStatusOptions.map(({ value, label }) => ({ value, label })),
  ]
  const created = Boolean((location.state as { created?: boolean } | null)?.created)
  const deleted = Boolean((location.state as { deleted?: boolean } | null)?.deleted)

  useEffect(() => {
    // Presets are transient. Remove the legacy saved-preset value once.
    window.localStorage.removeItem(VIEW_PRESET_STORAGE_KEY)
  }, [])

  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const requestedStatus = query.get("status")
    if (requestedStatus === "active" || requestedStatus === "closed") {
      setStatusFilter(requestedStatus)
    }

    const requestedPreset = query.get("preset")
    if (isViewPreset(requestedPreset)) {
      setTemporaryPreset(requestedPreset)
      setVisibleColumns(columnVisibilityForPreset(requestedPreset))
      setStatusFilter(viewPresetStatus[requestedPreset])
      setSortColumn(viewPresetSort[requestedPreset].column)
      setSortDirection(viewPresetSort[requestedPreset].direction)
    }
  }, [location.search])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [searchQuery])

  useEffect(() => {
    if (searchQuery) {
      window.sessionStorage.setItem(SEARCH_QUERY_STORAGE_KEY, searchQuery)
    } else {
      window.sessionStorage.removeItem(SEARCH_QUERY_STORAGE_KEY)
    }
  }, [searchQuery])

  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          (statusFilter === "all" ||
            (statusFilter === "active"
              ? isActiveServiceStatus(request.status)
              : request.status === statusFilter)) &&
          requestMatchesSearch(request, debouncedSearchQuery)
      ),
    [debouncedSearchQuery, requests, statusFilter]
  )
  const sortedRequests = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRequests

    return [...filteredRequests].sort((first, second) => {
      const firstValue = sortableValue(first, sortColumn, orderedStatusOptions.map(({ value }) => value))
      const secondValue = sortableValue(second, sortColumn, orderedStatusOptions.map(({ value }) => value))
      const comparison =
        typeof firstValue === "number" && typeof secondValue === "number"
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue), "pl")

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredRequests, orderedStatusOptions, sortColumn, sortDirection])

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

  useEffect(() => {
    if (temporaryPreset) return
    window.localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [temporaryPreset, visibleColumns])

  useEffect(() => {
    if (temporaryPreset) return
    window.localStorage.setItem(STATUS_FILTER_STORAGE_KEY, statusFilter)
  }, [statusFilter, temporaryPreset])

  useEffect(() => {
    if (temporaryPreset) return
    if (!sortColumn || !sortDirection) {
      window.localStorage.removeItem(TABLE_SORT_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      TABLE_SORT_STORAGE_KEY,
      JSON.stringify({ column: sortColumn, direction: sortDirection })
    )
  }, [sortColumn, sortDirection, temporaryPreset])

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

  async function handleReopen(request: ServiceRequest) {
    setError(null)
    setUpdatingStatusIds((current) => new Set(current).add(request.id))
    try {
      const updatedRequest = await reopenServiceRequest(request.id)
      setRequests((current) =>
        current.map((item) => (item.id === request.id ? updatedRequest : item))
      )
    } catch (reopenError) {
      setError(
        typeof reopenError === "string"
          ? reopenError
          : `Nie udało się wznowić zlecenia #${request.id}.`
      )
    } finally {
      setUpdatingStatusIds((current) => {
        const next = new Set(current)
        next.delete(request.id)
        return next
      })
    }
  }

  function toggleColumn(column: TableColumnId, visible: boolean) {
    setVisibleColumns((current) => ({ ...current, [column]: visible }))
  }

  function applyViewPreset(preset: ViewPreset) {
    setTemporaryPreset(preset)
    setVisibleColumns(columnVisibilityForPreset(preset))
    setStatusFilter(viewPresetStatus[preset])
    setSortColumn(viewPresetSort[preset].column)
    setSortDirection(viewPresetSort[preset].direction)
  }

  function restoreSavedView() {
    setTemporaryPreset(null)
    setStatusFilter(loadStatusFilter())
    setVisibleColumns(loadColumnVisibility())
    const savedViewSort = loadTableSort()
    setSortColumn(savedViewSort.column)
    setSortDirection(savedViewSort.direction)
  }

  function cycleSort(column: SortColumn) {
    if (sortColumn !== column || sortDirection === null) {
      setSortColumn(column)
      setSortDirection("desc")
    } else if (sortDirection === "desc") {
      setSortDirection("asc")
    } else {
      setSortColumn(null)
      setSortDirection(null)
    }
  }

  function renderTableCell(request: ServiceRequest, column: TableColumnId) {
    switch (column) {
      case "status": return <td key={column} className="px-4 py-3" onClick={(event) => event.stopPropagation()}><StatusSelect value={request.status} onValueChange={(status) => void handleStatusChange(request, status)} disabled={updatingStatusIds.has(request.id)} compact className="h-7 text-xs" aria-label={`Status zlecenia #${request.id}`} /></td>
      case "customer": return <td key={column} className="px-4 py-3"><div className="font-medium">{request.client.name} {request.client.surname}</div>{!visibleColumns.phone && request.client.phone && <div className="text-xs text-muted-foreground">{formatPhoneNumber(request.client.phone)}</div>}</td>
      case "phone": return <td key={column} className="whitespace-nowrap px-4 py-3">{request.client.phone ? formatPhoneNumber(request.client.phone) : "—"}</td>
      case "device": return <td key={column} className="px-4 py-3"><div className="font-medium">{request.device.name}</div><div className="text-xs text-muted-foreground">{[request.device.manufacturer, request.device.model, request.device.serialNumber ? `S/N: ${request.device.serialNumber}` : undefined].filter(Boolean).join(" · ")}</div></td>
      case "manufacturer": return <td key={column} className="px-4 py-3">{request.device.manufacturer ?? "—"}</td>
      case "model": return <td key={column} className="px-4 py-3">{request.device.model ?? "—"}</td>
      case "serialNumber": return <td key={column} className="whitespace-nowrap px-4 py-3 font-mono text-xs">{request.device.serialNumber ?? "—"}</td>
      case "defect": return <td key={column} className="max-w-56 px-4 py-3 text-muted-foreground" title={request.device.defect ?? undefined}><span className="line-clamp-2">{request.device.defect ?? "—"}</span></td>
      case "repairTime": return <td key={column} className="whitespace-nowrap px-4 py-3">{request.repairTime ?? "—"}</td>
      case "estimate": return <td key={column} className="px-4 py-3 text-right font-semibold tabular-nums">{formatCost(finalPrice(request.costEstimate, request.additionalCosts))}</td>
      case "additionalCosts": return <td key={column} className="px-4 py-3 tabular-nums">{additionalCostsTotal(request)}</td>
      case "profit": {
        const profit = (finalPrice(request.costEstimate, request.additionalCosts) ?? 0) - totalAdditionalExpenses(request.additionalCosts)
        return <td key={column} className={cn("px-4 py-3 text-right font-semibold tabular-nums", profit < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-300")}>{formatCost(profit)}</td>
      }
      case "checkIn": return <td key={column} className="px-4 py-3"><TransportCell request={request} direction="checkIn" /></td>
      case "checkOut": return <td key={column} className="px-4 py-3"><TransportCell request={request} direction="checkOut" /></td>
      case "repairCard": return <td key={column} className="px-4 py-3">{request.client.preferences?.repairCard ? "Tak" : "—"}</td>
      case "invoice": return <td key={column} className="px-4 py-3">{request.client.preferences?.invoice ? "Tak" : "—"}</td>
      case "createdAt": return <td key={column} className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCreatedAt(request.createdAt)}</td>
      case "statusChangedAt": return <td key={column} className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCreatedAt(request.statusChangedAt)}</td>
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Naprawy</h1>
          <p className="text-muted-foreground">Lista zarejestrowanych napraw serwisowych.</p>
        </div>
      </header>

      {created && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Zlecenie serwisowe zostało zapisane.
        </div>
      )}

      {deleted && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Zlecenie serwisowe zostało usunięte.
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

      <Card className="bg-muted/20">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap justify-end gap-3">
            <div className="flex flex-wrap gap-1" aria-label="Presety widoku tabeli">
            <Button type="button" variant="outline" size="icon" className={cn("text-violet-600 hover:bg-violet-500/10 hover:text-violet-700 dark:text-violet-400", temporaryPreset === "compact" && "border-violet-500/50 bg-violet-500/15")} onClick={() => applyViewPreset("compact")} aria-label="Kompaktowy widok" title="Kompaktowy widok"><SlidersHorizontalIcon /></Button>
            <Button type="button" variant="outline" size="icon" className={cn("text-sky-600 hover:bg-sky-500/10 hover:text-sky-700 dark:text-sky-400", temporaryPreset === "schedule" && "border-sky-500/50 bg-sky-500/15")} onClick={() => applyViewPreset("schedule")} aria-label="Widok terminów" title="Widok terminów"><CalendarDaysIcon /></Button>
            <Button type="button" variant="outline" size="icon" className={cn("text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400", temporaryPreset === "financial" && "border-emerald-500/50 bg-emerald-500/15")} onClick={() => applyViewPreset("financial")} aria-label="Widok finansowy" title="Widok finansowy"><WalletCardsIcon /></Button>
            <Button type="button" variant="outline" size="icon" className={cn("text-slate-600 hover:bg-slate-500/10 hover:text-slate-700 dark:text-slate-300", temporaryPreset === "intake" && "border-slate-500/50 bg-slate-500/15")} onClick={() => applyViewPreset("intake")} aria-label="Widok przyjęć" title="Widok przyjęć"><PackageCheckIcon /></Button>
            <Button type="button" variant="outline" size="icon" className={cn("text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400", temporaryPreset === "workshop" && "border-red-500/50 bg-red-500/15")} onClick={() => applyViewPreset("workshop")} aria-label="Widok warsztatu" title="Widok warsztatu"><WrenchIcon /></Button>
            <Button type="button" variant="outline" size="icon" className={cn("text-cyan-600 hover:bg-cyan-500/10 hover:text-cyan-700 dark:text-cyan-400", temporaryPreset === "returns" && "border-cyan-500/50 bg-cyan-500/15")} onClick={() => applyViewPreset("returns")} aria-label="Widok wydań" title="Widok wydań"><TruckIcon /></Button>
            </div>
            <div className="flex gap-1" aria-label="Akcje presetów">
            <Button type="button" variant="outline" size="icon" className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400" onClick={restoreSavedView} aria-label="Przywróć zapisany widok" title="Przywróć zapisany widok"><RotateCcwIcon /></Button>
            </div>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Status
          </label>
          <Select
            items={statusFilterOptions}
            value={statusFilter}
            onValueChange={(value) => {
              if (value) {
                setStatusFilter(value as StatusFilter)
              }
            }}
          >
            <SelectTrigger className="h-9 w-64" aria-label="Filtr statusu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              <SelectGroup>
                {statusFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value !== "all" && option.value !== "active" && (
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          serviceStatusDotClasses[option.value]
                        )}
                      />
                    )}
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-full gap-2 lg:max-w-xl">
          <div className="min-w-0 flex-1">
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
                onClick={() => {
                  setSearchQuery("")
                  setDebouncedSearchQuery("")
                }}
                aria-label="Wyczyść wyszukiwanie"
              >
                <XIcon />
              </Button>
            )}
          </div>
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" size="icon" aria-label="Wybierz widoczne kolumny" />
              }
            >
              <SlidersHorizontalIcon />
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-96 w-64 overflow-y-auto p-3">
              <p className="px-1 pb-2 text-sm font-medium">Widoczne kolumny</p>
              <div className="grid gap-2">
                {tableColumnOptions.map((column) => (
                  <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                    <Checkbox
                      checked={visibleColumns[column.id]}
                      onCheckedChange={(checked) => toggleColumn(column.id, checked === true)}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setVisibleColumns(defaultColumnVisibility)}
              >
                Przywróć domyślne
              </Button>
            </PopoverContent>
          </Popover>
          {sortColumn && sortDirection && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSortColumn(null)
                setSortDirection(null)
              }}
            >
              <RotateCcwIcon data-icon="inline-start" />
              Wyczyść sortowanie
            </Button>
          )}
          </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Zlecenia serwisowe</CardTitle>
            <CardDescription>
            {loading
              ? "Pobieranie zleceń…"
              : debouncedSearchQuery.trim()
                ? `${filteredRequests.length} z ${requests.length} zleceń`
                : `${filteredRequests.length} ${filteredRequests.length === 1 ? "zlecenie" : "zleceń"}`}
            </CardDescription>
          </div>
          {!loading && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
              {filteredRequests.length}
            </span>
          )}
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
                  {debouncedSearchQuery.trim()
                    ? "Nie znaleziono zleceń pasujących do wyszukiwania i wybranego statusu."
                    : "Nie ma zleceń o wybranym statusie."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-y bg-muted/50 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3" aria-sort={sortColumn === "id" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}>
                      <SortableColumnHeader label="Zlecenie" column="id" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} />
                    </th>
                    {false && <>
                    {visibleColumns.status && <th className="px-4 py-3" aria-sort={sortColumn === "status" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Status" column="status" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.customer && <th className="px-4 py-3" aria-sort={sortColumn === "customer" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Klient" column="customer" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.phone && <th className="px-4 py-3" aria-sort={sortColumn === "phone" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Telefon" column="phone" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.device && <th className="px-4 py-3" aria-sort={sortColumn === "device" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Urządzenie" column="device" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.manufacturer && <th className="px-4 py-3" aria-sort={sortColumn === "manufacturer" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Producent" column="manufacturer" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.model && <th className="px-4 py-3" aria-sort={sortColumn === "model" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Model" column="model" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.serialNumber && <th className="px-4 py-3" aria-sort={sortColumn === "serialNumber" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Numer seryjny" column="serialNumber" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.defect && <th className="px-4 py-3" aria-sort={sortColumn === "defect" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Opis usterki" column="defect" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.repairTime && <th className="px-4 py-3" aria-sort={sortColumn === "repairTime" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Czas naprawy" column="repairTime" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.estimate && <th className="px-4 py-3 text-right" aria-sort={sortColumn === "estimate" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Kwota końcowa" column="estimate" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.additionalCosts && <th className="px-4 py-3" aria-sort={sortColumn === "additionalCosts" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Wydatki" column="additionalCosts" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.checkIn && <th className="px-4 py-3" aria-sort={sortColumn === "checkIn" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Przyjęcie" column="checkIn" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.checkOut && <th className="px-4 py-3" aria-sort={sortColumn === "checkOut" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Zwrot" column="checkOut" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.createdAt && <th className="px-4 py-3" aria-sort={sortColumn === "createdAt" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Utworzono" column="createdAt" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    {visibleColumns.statusChangedAt && <th className="px-4 py-3" aria-sort={sortColumn === "statusChangedAt" && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label="Zmiana statusu" column="statusChangedAt" activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>}
                    </>}
                    {columnOrder.filter((column) => visibleColumns[column]).map((column) => <th key={column} className={column === "estimate" ? "px-4 py-3 text-right" : "px-4 py-3"} aria-sort={sortColumn === column && sortDirection ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortableColumnHeader label={tableColumnOptions.find((option) => option.id === column)?.label ?? column} column={column} activeColumn={sortColumn} direction={sortDirection} onSort={cycleSort} /></th>)}
                    <th className="px-4 py-3 text-right font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedRequests.map((request) => (
                    <ContextMenu key={request.id}>
                      <ContextMenuTrigger
                        render={<tr className="transition-colors hover:bg-muted/30" />}
                      >
                      <td className="px-4 py-3 font-medium">
                        <span className="text-muted-foreground/70">#</span>
                        {request.id}
                      </td>
                      {false && <>
                      {visibleColumns.status && <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <StatusSelect
                          value={request.status}
                          onValueChange={(status) =>
                            void handleStatusChange(request, status)
                          }
                          disabled={updatingStatusIds.has(request.id)}
                          compact
                          className="h-7 text-xs"
                          aria-label={`Status zlecenia #${request.id}`}
                        />
                      </td>}
                      {visibleColumns.customer && <td className="px-4 py-3">
                        <div className="font-medium">
                          {request.client.name} {request.client.surname}
                        </div>
                        {!visibleColumns.phone && request.client.phone && (
                          <div className="text-xs text-muted-foreground">
                            {formatPhoneNumber(request.client.phone)}
                          </div>
                        )}
                      </td>}
                      {visibleColumns.phone && <td className="whitespace-nowrap px-4 py-3">{request.client.phone ? formatPhoneNumber(request.client.phone) : "—"}</td>}
                      {visibleColumns.device && <td className="px-4 py-3">
                        <div className="font-medium">{request.device.name}</div>
                        {(request.device.manufacturer ||
                          request.device.model ||
                          request.device.serialNumber) && (
                          <div className="text-xs text-muted-foreground">
                            {[
                              request.device.manufacturer,
                              request.device.model,
                              request.device.serialNumber
                                ? `S/N: ${request.device.serialNumber}`
                                : undefined,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </td>}
                      {visibleColumns.manufacturer && <td className="px-4 py-3">{request.device.manufacturer ?? "—"}</td>}
                      {visibleColumns.model && <td className="px-4 py-3">{request.device.model ?? "—"}</td>}
                      {visibleColumns.serialNumber && <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{request.device.serialNumber ?? "—"}</td>}
                      {visibleColumns.defect && <td className="max-w-56 px-4 py-3 text-muted-foreground" title={request.device.defect ?? undefined}><span className="line-clamp-2">{request.device.defect ?? "—"}</span></td>}
                      {visibleColumns.repairTime && <td className="whitespace-nowrap px-4 py-3">{request.repairTime ?? "—"}</td>}
                      {visibleColumns.estimate && <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCost(finalPrice(request.costEstimate, request.additionalCosts))}
                      </td>}
                      {visibleColumns.additionalCosts && <td className="px-4 py-3 tabular-nums">{additionalCostsTotal(request)}</td>}
                      {visibleColumns.checkIn && <td className="px-4 py-3"><TransportCell request={request} direction="checkIn" /></td>}
                      {visibleColumns.checkOut && <td className="px-4 py-3"><TransportCell request={request} direction="checkOut" /></td>}
                      {visibleColumns.createdAt && <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatCreatedAt(request.createdAt)}
                      </td>}
                      {visibleColumns.statusChangedAt && <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatCreatedAt(request.statusChangedAt)}</td>}
                      </>}
                      {columnOrder.filter((column) => visibleColumns[column]).map((column) => renderTableCell(request, column))}
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link to={`/naprawy/${request.id}?edit=1`} />} aria-label={`Edytuj zlecenie #${request.id}`} title="Edytuj zlecenie">
                            <PencilIcon />
                          </Button>
                          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link to={`/naprawy/${request.id}`} />} aria-label={`Otwórz zlecenie #${request.id}`} title="Otwórz zlecenie">
                            <EyeIcon />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-sm" disabled={(!isActiveServiceStatus(request.status) && request.status !== "closed") || updatingStatusIds.has(request.id)} onClick={() => void (request.status === "closed" ? handleReopen(request) : handleStatusChange(request, "closed"))} aria-label={`${request.status === "closed" ? "Wznów" : "Zamknij"} zlecenie #${request.id}`} title={request.status === "closed" ? "Wznów zlecenie" : "Zamknij zlecenie"}>
                            {request.status === "closed" ? <RotateCcwIcon className="text-sky-600" /> : <CircleCheckIcon className="text-emerald-600" />}
                          </Button>
                          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link to={`/naprawy/${request.id}/karta-naprawy`} />} aria-label={`Otwórz kartę naprawy zlecenia #${request.id}`} title="Karta naprawy">
                            <FileTextIcon />
                          </Button>
                        </div>
                      </td>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem render={<Link to={`/naprawy/${request.id}`} />}>
                          <EyeIcon className="size-4" />
                          Otwórz
                        </ContextMenuItem>
                        <ContextMenuItem render={<Link to={`/naprawy/${request.id}?edit=1`} />}>
                          <PencilIcon className="size-4" />
                          Edytuj
                        </ContextMenuItem>
                        <ContextMenuItem render={<Link to={`/naprawy/${request.id}/karta-naprawy`} />}>
                          <FileTextIcon className="size-4" />
                          Karta naprawy
                        </ContextMenuItem>
                        <ContextMenuItem
                          disabled={(!isActiveServiceStatus(request.status) && request.status !== "closed") || updatingStatusIds.has(request.id)}
                          onClick={() => void (request.status === "closed" ? handleReopen(request) : handleStatusChange(request, "closed"))}
                        >
                          {request.status === "closed" ? (
                            <RotateCcwIcon className="size-4 text-sky-600" />
                          ) : (
                            <CircleCheckIcon className="size-4 text-emerald-600" />
                          )}
                          {request.status === "closed" ? "Wznów" : "Zamknij"}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
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
