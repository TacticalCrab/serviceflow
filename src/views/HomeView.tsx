import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isValid,
  startOfDay,
  startOfMonth,
} from "date-fns"
import { pl } from "date-fns/locale"
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ClipboardListIcon,
  LoaderCircleIcon,
  PackageCheckIcon,
  PlusIcon,
  TruckIcon,
  WalletCardsIcon,
  WrenchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  listServiceRequests,
  type ServiceRequest,
} from "@/features/ServiceRequests/api"
import { isActiveServiceStatus } from "@/features/ServiceRequests/status"
import { cn } from "@/lib/utils"

function isDateInPeriod(value: string, from: Date, to: Date) {
  const date = new Date(value)

  return (
    isValid(date) &&
    !isBefore(date, startOfDay(from)) &&
    !isAfter(date, endOfDay(to))
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(value)
}

type PeriodPickerProps = {
  label: string
  value: Date
  onChange: (date: Date) => void
  disabled?: (date: Date) => boolean
}

function PeriodPicker({ label, value, onChange, disabled }: PeriodPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="justify-start font-normal" />
        }
      >
        <CalendarDaysIcon data-icon="inline-start" />
        <span className="text-muted-foreground">{label}:</span>
        {format(value, "d MMM yyyy", { locale: pl })}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            if (!date) return
            onChange(date)
            setOpen(false)
          }}
          disabled={disabled}
          locale={pl}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

type StatCardProps = {
  title: string
  value: React.ReactNode
  description: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  accent?: "primary" | "success" | "warning"
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "primary",
}: StatCardProps) {
  return (
    <Card className="min-h-44">
      <CardHeader className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
        </div>
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            accent === "success" &&
              "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            accent === "warning" &&
              "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            accent === "primary" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardHeader>
      <CardContent className="mt-auto text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  )
}

type ScheduledTransportCardProps = {
  request: ServiceRequest
  date: Date
  method: "clientDropOff" | "servicePickup" | "clientPickup" | "serviceDelivery"
}

function ScheduledTransportCard({
  request,
  date,
  method,
}: ScheduledTransportCardProps) {
  const clientName = [request.client.name, request.client.surname]
    .filter(Boolean)
    .join(" ")
  const deviceName = [request.device.name, request.device.model]
    .filter(Boolean)
    .join(" · ")
  const transportDetails = {
    clientDropOff: {
      title: "Klient przywozi urządzenie",
      shortLabel: "Przyjęcie urządzenia",
      icon: PackageCheckIcon,
    },
    servicePickup: {
      title: "Serwis odbiera urządzenie",
      shortLabel: "Odbiór od klienta",
      icon: TruckIcon,
    },
    clientPickup: {
      title: "Klient odbiera urządzenie",
      shortLabel: "Wydanie urządzenia",
      icon: PackageCheckIcon,
    },
    serviceDelivery: {
      title: "Serwis dostarcza urządzenie",
      shortLabel: "Dostawa do klienta",
      icon: TruckIcon,
    },
  }[method]
  const Icon = transportDetails.icon

  return (
    <Link
      to={`/naprawy/${request.id}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`${transportDetails.shortLabel} dla zlecenia #${request.id}`}
    >
      <Card className="h-full transition-[transform,border-color,box-shadow] group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-md">
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle>{transportDetails.title}</CardTitle>
              <CardDescription>Zlecenie #{request.id}</CardDescription>
            </div>
            <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-base font-semibold capitalize">
              {format(date, "EEEE, d MMMM yyyy", { locale: pl })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {deviceName} dla {clientName}
            </p>
          </div>
          {request.client.address && (
            <p className="line-clamp-2 border-t pt-3 text-xs text-muted-foreground">
              {request.client.address}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function HomeView() {
  const [periodStart, setPeriodStart] = useState(() => startOfMonth(new Date()))
  const [periodEnd, setPeriodEnd] = useState(() => endOfMonth(new Date()))
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
              : "Nie udało się pobrać danych panelu."
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

  const stats = useMemo(() => {
    const inProgress = requests.filter(
      (request) =>
        isActiveServiceStatus(request.status) &&
        isDateInPeriod(request.createdAt, periodStart, periodEnd)
    )
    const completed = requests.filter(
      (request) =>
        request.status === "closed" &&
        isDateInPeriod(request.statusChangedAt, periodStart, periodEnd)
    )
    const revenue = completed.reduce(
      (sum, request) => sum + (request.costEstimate ?? 0),
      0
    )
    const costs = completed.reduce(
      (sum, request) =>
        sum +
        (request.additionalCosts?.reduce(
          (costSum, additionalCost) => costSum + additionalCost.price,
          0
        ) ?? 0),
      0
    )
    const today = startOfDay(new Date())
    const futureCheckIns = requests
      .flatMap((request) => {
        if (request.status !== "waiting_for_device") return []

        const checkIn = request.client.preferences?.checkIn
        if (!checkIn?.method || !checkIn.date) return []

        const date = new Date(checkIn.date)
        return isValid(date) && !isBefore(date, today)
          ? [{ request, date, method: checkIn.method }]
          : []
      })
      .sort((first, second) => first.date.getTime() - second.date.getTime())
    const futureReturns = requests
      .flatMap((request) => {
        if (request.status === "closed") return []

        const checkOut = request.client.preferences?.checkOut
        if (!checkOut?.method || !checkOut.date) return []

        const date = new Date(checkOut.date)
        return isValid(date) && !isBefore(date, today)
          ? [{ request, date, method: checkOut.method }]
          : []
      })
      .sort((first, second) => first.date.getTime() - second.date.getTime())

    return {
      inProgress: inProgress.length,
      completed: completed.length,
      revenue,
      costs,
      profit: revenue - costs,
      futureCheckIns,
      futureReturns,
    }
  }, [periodEnd, periodStart, requests])

  const statValue = (value: React.ReactNode) =>
    loading ? (
      <LoaderCircleIcon className="size-7 animate-spin text-muted-foreground" />
    ) : (
      value
    )

  return (
    <section className="grid gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Panel serwisowy</p>
          <h1 className="text-3xl font-semibold tracking-tight">Strona Główna</h1>
          <p className="max-w-2xl text-muted-foreground">
            Najważniejsze informacje o pracy serwisu w jednym miejscu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Zakres statystyk">
          <PeriodPicker
            label="Od"
            value={periodStart}
            onChange={setPeriodStart}
            disabled={(date) => isAfter(date, periodEnd)}
          />
          <PeriodPicker
            label="Do"
            value={periodEnd}
            onChange={setPeriodEnd}
            disabled={(date) => isBefore(date, periodStart)}
          />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Szybkie akcje</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardListIcon className="size-5" />
              </div>
              <CardTitle>Naprawy</CardTitle>
              <CardDescription>
                Przejdź do listy zarejestrowanych napraw i zleceń.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to="/naprawy" />}
              >
                Zobacz naprawy
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PlusIcon className="size-5" />
              </div>
              <CardTitle>Nowe zlecenie</CardTitle>
              <CardDescription>
                Dodaj klienta, urządzenie oraz szczegóły planowanej naprawy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button nativeButton={false} render={<Link to="/zlecenia/nowe" />}>
                Utwórz zlecenie
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="W trakcie naprawy"
          value={statValue(stats.inProgress)}
          description="Zlecenia przyjęte w wybranym okresie"
          icon={WrenchIcon}
        />
        <StatCard
          title="Naprawione ekspresy"
          value={statValue(stats.completed)}
          description="Zlecenia zamknięte w wybranym okresie"
          icon={CheckCircle2Icon}
          accent="success"
        />
        <StatCard
          title="Koszt / zysk"
          value={statValue(formatCurrency(stats.profit))}
          description={
            <div className="grid gap-1">
              <div>Wartość: {formatCurrency(stats.revenue)}</div>
              <div>Koszty: {formatCurrency(stats.costs)}</div>
            </div>
          }
          icon={WalletCardsIcon}
          accent={stats.profit < 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Zaplanowane wydania urządzeń</h2>
          {!loading && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {stats.futureReturns.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Pobieranie wydań…
          </div>
        ) : stats.futureReturns.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.futureReturns.map(({ request, date, method }) => (
              <ScheduledTransportCard
                key={`return-${request.id}-${date.toISOString()}`}
                request={request}
                date={date}
                method={method}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Brak zaplanowanych wydań lub dostaw urządzeń.
          </div>
        )}
      </div>

      <div className="grid gap-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Zaplanowane przyjęcia urządzeń</h2>
          {!loading && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {stats.futureCheckIns.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Pobieranie przyjęć…
          </div>
        ) : stats.futureCheckIns.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.futureCheckIns.map(({ request, date, method }) => (
              <ScheduledTransportCard
                key={`check-in-${request.id}-${date.toISOString()}`}
                request={request}
                date={date}
                method={method}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Brak zaplanowanych przyjęć lub odbiorów urządzeń.
          </div>
        )}
      </div>

    </section>
  )
}

export { HomeView }
