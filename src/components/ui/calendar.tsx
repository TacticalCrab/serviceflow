"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ManualDateInput = {
  value?: Date
  onValueChange: (date: Date | undefined) => void
  placeholder?: string
}

function parseManualDate(value: string) {
  for (const dateFormat of ["dd.MM.yyyy", "yyyy-MM-dd"]) {
    const date = parse(value, dateFormat, new Date())
    if (isValid(date) && format(date, dateFormat) === value) return date
  }

  return undefined
}

function CalendarManualDateInput({ value, onValueChange, placeholder }: ManualDateInput) {
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "dd.MM.yyyy") : ""
  )

  React.useEffect(() => {
    setInputValue(value ? format(value, "dd.MM.yyyy") : "")
  }, [value])

  return (
    <div className="px-2 pt-2">
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={() => {
          const trimmedValue = inputValue.trim()
          const date = trimmedValue ? parseManualDate(trimmedValue) : undefined
          onValueChange(date)
          setInputValue(date ? format(date, "dd.MM.yyyy") : "")
        }}
        placeholder={placeholder ?? "DD.MM.RRRR"}
        aria-label="Wpisz datę ręcznie"
      />
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  manualDateInput,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  manualDateInput?: ManualDateInput
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <div className={cn("w-fit bg-background", className)}>
      {manualDateInput && <CalendarManualDateInput {...manualDateInput} />}
      <DayPicker
      showOutsideDays={showOutsideDays}
        className="group/calendar bg-transparent p-2 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(7)] in-data-[slot=popover-content]:bg-transparent"
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 bg-popover opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "text-sm font-medium select-none",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none",
          defaultClassNames.day
        ),
        today: cn(
          "rounded-(--cell-radius) bg-muted text-foreground",
          defaultClassNames.today
        ),
        outside: cn("text-muted-foreground opacity-60", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeftIcon
              : orientation === "right"
                ? ChevronRightIcon
                : ChevronDownIcon

          return <Icon className={cn("size-4", chevronClassName)} {...chevronProps} />
        },
        DayButton: (dayButtonProps) => (
          <CalendarDayButton locale={locale} {...dayButtonProps} />
        ),
        ...components,
      }}
      {...props}
      />
    </div>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
