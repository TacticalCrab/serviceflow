import { ConfiguredValueInput } from "@/components/ConfiguredValueInput"
import { useAdditionalCostHints } from "@/features/AdditionalCosts/hints"

function AdditionalCostHintInput({
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
      options={useAdditionalCostHints()}
      value={value}
      onValueChange={onValueChange}
      aria-label={props["aria-label"] ?? "Opis wydatku"}
    />
  )
}

export { AdditionalCostHintInput }
