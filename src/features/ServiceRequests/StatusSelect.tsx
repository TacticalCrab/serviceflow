import { LoaderCircleIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ServiceStatus } from "@/features/ServiceRequests/api"
import {
  serviceStatusDotClasses,
  serviceStatusLabels,
  serviceStatusSelectClasses,
} from "@/features/ServiceRequests/status"
import { useOrderedServiceStatuses } from "@/features/ServiceRequests/statusOrder"
import { cn } from "@/lib/utils"

type StatusSelectProps = {
  value: ServiceStatus
  onValueChange: (value: ServiceStatus) => void
  disabled?: boolean
  compact?: boolean
  className?: string
  "aria-label"?: string
}

function StatusSelect({
  value,
  onValueChange,
  disabled,
  compact = false,
  className,
  "aria-label": ariaLabel = "Status zlecenia",
}: StatusSelectProps) {
  const statusOptions = useOrderedServiceStatuses()

  return (
    <Select
      items={statusOptions}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) onValueChange(nextValue as ServiceStatus)
      }}
      disabled={disabled}
    >
      <SelectTrigger
        size={compact ? "sm" : "default"}
        aria-label={ariaLabel}
        className={cn(
          compact
            ? "w-auto min-w-0 border-transparent px-2 shadow-none"
            : "w-full min-w-56",
          compact && serviceStatusSelectClasses[value],
          className
        )}
      >
        {disabled ? (
          <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span
            className={cn(
              "size-2 shrink-0 rounded-full ring-2 ring-background",
              "self-center",
              serviceStatusDotClasses[value]
            )}
          />
        )}
        <SelectValue>
          {() => serviceStatusLabels[value]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="min-w-72"
      >
        <SelectGroup>
          <SelectLabel>Zmień status zlecenia</SelectLabel>
          {statusOptions.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              <span
                className={cn(
                  "size-2 shrink-0 self-center rounded-full",
                  serviceStatusDotClasses[status.value]
                )}
              />
              {status.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export { StatusSelect }
