import { useEffect, useState } from "react"
import { Clock3Icon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type TimeInputProps = {
  id?: string
  name?: string
  value?: string
  onBlur?: () => void
  onValueChange: (value: string | undefined) => void
  className?: string
  invalid?: boolean
}

const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"))
const minutes = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"))

function parseTime(value?: string) {
  const [hour = "", minute = ""] = value?.split(":") ?? []
  return { hour, minute }
}

function normalizeTime(rawValue: string) {
  const raw = rawValue.trim()
  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})$/)
  const digits = raw.replace(/\D/g, "")
  const compactMatch = !colonMatch && (digits.match(/^(\d)(\d{2})$/) ?? digits.match(/^(\d{2})(\d{2})$/))
  const match = colonMatch ?? compactMatch

  if (!match) return undefined

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

/** A custom time picker that supports both direct keyboard entry and select-based picking. */
function TimeInput({ id, name, value, onBlur, onValueChange, className, invalid }: TimeInputProps) {
  const { hour, minute } = parseTime(value)
  const [draft, setDraft] = useState(value ?? "")

  useEffect(() => {
    setDraft(value ?? "")
  }, [value])

  function update(nextHour: string, nextMinute: string) {
    onValueChange(`${nextHour || "00"}:${nextMinute || "00"}`)
  }

  function commitDraft() {
    if (!draft.trim()) {
      onValueChange(undefined)
      return
    }

    const normalized = normalizeTime(draft)
    if (normalized) {
      setDraft(normalized)
      onValueChange(normalized)
    } else {
      setDraft(value ?? "")
    }
  }

  return (
    <div aria-invalid={invalid || undefined} className={cn("flex h-8 w-full items-center gap-1 rounded-lg border border-input bg-transparent px-1 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20", className)}>
      <Input
        id={id}
        name={name}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          commitDraft()
          onBlur?.()
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
        }}
        inputMode="numeric"
        placeholder="GG:MM"
        aria-label="Godzina (format GG:MM)"
        className="h-7 min-w-0 flex-1 border-0 bg-transparent px-1.5 font-mono shadow-none focus-visible:ring-0"
      />
      <Popover>
        <PopoverTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" className="size-6 shrink-0" aria-label="Wybierz godzinę" />}
        >
          <Clock3Icon />
        </PopoverTrigger>
        <PopoverContent className="w-52">
          <div className="grid grid-cols-2 gap-2">
            <Select value={hour || null} onValueChange={(nextHour) => update(nextHour ?? "", minute)}>
              <SelectTrigger aria-label="Godzina" className="w-full"><SelectValue placeholder="Godzina" /></SelectTrigger>
              <SelectContent align="start">{hours.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={minute || null} onValueChange={(nextMinute) => update(hour, nextMinute ?? "")}>
              <SelectTrigger aria-label="Minuty" className="w-full"><SelectValue placeholder="Minuty" /></SelectTrigger>
              <SelectContent align="end">{minutes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-6 shrink-0"
          aria-label="Wyczyść godzinę"
          onClick={() => onValueChange(undefined)}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}

export { TimeInput }
