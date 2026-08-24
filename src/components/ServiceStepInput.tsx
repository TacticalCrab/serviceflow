import { ConfiguredValueInput } from "@/components/ConfiguredValueInput"
import { useServiceSteps } from "@/features/ServiceSteps/serviceSteps"

function ServiceStepInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof ConfiguredValueInput>, "options" | "value" | "onValueChange"> & {
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <ConfiguredValueInput
      {...props}
      options={useServiceSteps()}
      value={value}
      onValueChange={onValueChange}
      aria-label={props["aria-label"] ?? "Krok naprawy"}
    />
  )
}

export { ServiceStepInput }
