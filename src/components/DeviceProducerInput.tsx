import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDeviceProducers } from "@/features/DeviceProducers/producers"
import { cn } from "@/lib/utils"

function DeviceProducerInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  value: string
  onValueChange: (value: string) => void
}) {
  const producers = useDeviceProducers()
  const selectedProducer = producers.find(
    (producer) => producer.toLocaleLowerCase("pl-PL") === value.toLocaleLowerCase("pl-PL")
  )

  return (
    <div className="flex">
      <Input
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("rounded-r-none", className)}
      />
      <Select
        items={producers.map((producer) => ({ value: producer, label: producer }))}
        value={selectedProducer ?? null}
        onValueChange={(producer) => {
          if (producer) onValueChange(producer)
        }}
      >
        <SelectTrigger
          className="h-auto w-10 shrink-0 rounded-l-none border-l-0 px-2"
          aria-label="Wybierz producenta z listy"
        >
          <SelectValue className="sr-only" />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} className="min-w-48">
          {producers.map((producer) => (
            <SelectItem key={producer} value={producer}>
              {producer}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { DeviceProducerInput }
