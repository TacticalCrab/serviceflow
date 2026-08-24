import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function ConfiguredValueInput({
  options,
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  options: string[]
  value: string
  onValueChange: (value: string) => void
}) {
  const selectedOption = options.find(
    (option) => option.toLocaleLowerCase("pl-PL") === value.toLocaleLowerCase("pl-PL")
  )

  return (
    <div className="flex">
      <Input
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn("rounded-r-none", className)}
        autoComplete="off"
      />
      <Select
        items={options.map((option) => ({ value: option, label: option }))}
        value={selectedOption ?? null}
        onValueChange={(option) => {
          if (option) onValueChange(option)
        }}
      >
        <SelectTrigger
          className="h-auto w-10 shrink-0 rounded-l-none border-l-0 px-2"
          aria-label="Wybierz wartość z listy"
        >
          <SelectValue className="sr-only" />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false} className="min-w-48">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { ConfiguredValueInput }
