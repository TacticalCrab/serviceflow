import { useEffect, useState } from "react"
import { useLocation } from "react-router"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  LoaderCircleIcon,
  WrenchIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  listServiceRequests,
  type ServiceRequest,
} from "@/features/ServiceRequests/api"

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

function RepairsView() {
  const location = useLocation()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const created = Boolean((location.state as { created?: boolean } | null)?.created)

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

      <Card>
        <CardHeader>
          <CardTitle>Aktywne naprawy</CardTitle>
          <CardDescription>
            {loading
              ? "Pobieranie zleceń…"
              : `${requests.length} ${requests.length === 1 ? "zlecenie" : "zleceń"}`}
          </CardDescription>
        </CardHeader>
        <CardContent className={requests.length > 0 ? "px-0" : undefined}>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Pobieranie napraw…
            </div>
          ) : requests.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <WrenchIcon className="size-5 text-primary" />
              </span>
              <div>
                <p className="font-medium">Brak napraw</p>
                <p className="text-sm text-muted-foreground">
                  Nowe zlecenia będą widoczne w tym miejscu.
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((request) => (
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
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {request.status === "new" ? "Nowe" : request.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatCreatedAt(request.createdAt)}
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
