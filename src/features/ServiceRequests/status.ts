import type { ServiceStatus } from "@/features/ServiceRequests/api"

const serviceStatusOptions: Array<{
  value: ServiceStatus
  label: string
  active: boolean
}> = [
  { value: "waiting_for_device", label: "Oczekuje na urządzenie", active: true },
  { value: "diagnosis", label: "Diagnostyka", active: true },
  {
    value: "waiting_for_approval",
    label: "Oczekuje na akceptację wyceny",
    active: true,
  },
  { value: "in_repair", label: "W naprawie", active: true },
  { value: "waiting_for_parts", label: "Oczekuje na części", active: true },
  { value: "ready_for_return", label: "Gotowe do odbioru lub dostawy", active: true },
  { value: "closed", label: "Zakończone", active: false },
  { value: "cancelled", label: "Anulowane", active: false },
]

const serviceStatusLabels = Object.fromEntries(
  serviceStatusOptions.map((status) => [status.value, status.label])
) as Record<ServiceStatus, string>

const serviceStatusBadgeClasses: Record<ServiceStatus, string> = {
  waiting_for_device: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  diagnosis: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  waiting_for_approval: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  in_repair: "bg-primary/10 text-primary",
  waiting_for_parts: "bg-orange-500/10 text-orange-800 dark:text-orange-300",
  ready_for_return: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
}

const serviceStatusDotClasses: Record<ServiceStatus, string> = {
  waiting_for_device: "bg-slate-500",
  diagnosis: "bg-sky-500",
  waiting_for_approval: "bg-amber-500",
  in_repair: "bg-primary",
  waiting_for_parts: "bg-orange-500",
  ready_for_return: "bg-emerald-500",
  closed: "bg-muted-foreground",
  cancelled: "bg-destructive",
}

function isActiveServiceStatus(status: ServiceStatus) {
  return serviceStatusOptions.some(
    (option) => option.value === status && option.active
  )
}

export {
  isActiveServiceStatus,
  serviceStatusBadgeClasses,
  serviceStatusDotClasses,
  serviceStatusLabels,
  serviceStatusOptions,
}
