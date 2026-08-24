import { ConfiguredValueInput } from "@/components/ConfiguredValueInput"
import { useDeviceProducers } from "@/features/DeviceProducers/producers"

function DeviceProducerInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof ConfiguredValueInput>, "options" | "value" | "onValueChange"> & {
  value: string
  onValueChange: (value: string) => void
}) {
  return <ConfiguredValueInput {...props} options={useDeviceProducers()} value={value} onValueChange={onValueChange} className={className} />
}

export { DeviceProducerInput }
