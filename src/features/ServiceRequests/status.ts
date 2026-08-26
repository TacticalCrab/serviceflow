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
  in_repair: "bg-red-500/10 text-red-800 dark:text-red-300",
  waiting_for_parts: "bg-orange-500/10 text-orange-800 dark:text-orange-300",
  ready_for_return: "bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
  closed: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  cancelled: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
}

const serviceStatusDotClasses: Record<ServiceStatus, string> = {
  waiting_for_device: "bg-slate-500",
  diagnosis: "bg-sky-500",
  waiting_for_approval: "bg-amber-500",
  in_repair: "bg-red-500",
  waiting_for_parts: "bg-orange-500",
  ready_for_return: "bg-cyan-500",
  closed: "bg-emerald-500",
  cancelled: "bg-slate-500",
}

const serviceStatusRowClasses: Record<ServiceStatus, string> = {
  waiting_for_device: "bg-slate-500/5 hover:bg-slate-500/10",
  diagnosis: "bg-sky-500/5 hover:bg-sky-500/10",
  waiting_for_approval: "bg-amber-500/5 hover:bg-amber-500/10",
  in_repair: "bg-red-500/5 hover:bg-red-500/10",
  waiting_for_parts: "bg-orange-500/5 hover:bg-orange-500/10",
  ready_for_return: "bg-cyan-500/5 hover:bg-cyan-500/10",
  closed: "bg-emerald-500/5 hover:bg-emerald-500/10",
  cancelled: "bg-slate-500/5 hover:bg-slate-500/10",
}

const serviceStatusSelectClasses: Record<ServiceStatus, string> = {
  waiting_for_device: "border-slate-500/30 bg-slate-500/10 text-slate-700 hover:bg-slate-500/15 data-pressed:bg-slate-500/20 dark:text-slate-300",
  diagnosis: "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 data-pressed:bg-sky-500/20 dark:text-sky-300",
  waiting_for_approval: "border-amber-500/30 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15 data-pressed:bg-amber-500/20 dark:text-amber-300",
  in_repair: "border-red-500/30 bg-red-500/10 text-red-800 hover:bg-red-500/15 data-pressed:bg-red-500/20 dark:text-red-300",
  waiting_for_parts: "border-orange-500/30 bg-orange-500/10 text-orange-800 hover:bg-orange-500/15 data-pressed:bg-orange-500/20 dark:text-orange-300",
  ready_for_return: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800 hover:bg-cyan-500/15 data-pressed:bg-cyan-500/20 dark:text-cyan-300",
  closed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 data-pressed:bg-emerald-500/20 dark:text-emerald-300",
  cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-700 hover:bg-slate-500/15 data-pressed:bg-slate-500/20 dark:text-slate-300",
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
  serviceStatusRowClasses,
  serviceStatusSelectClasses,
}
