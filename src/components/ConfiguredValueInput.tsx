import { useId, useMemo, useState } from "react"

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
  onBlur,
  onFocus,
  onKeyDown,
  allowEnterAction = false,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  options: string[]
  value: string
  onValueChange: (value: string) => void
  allowEnterAction?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [suggestionWasChosen, setSuggestionWasChosen] = useState(false)
  const suggestionId = useId()
  const selectedOption = options.find(
    (option) => option.toLocaleLowerCase("pl-PL") === value.toLocaleLowerCase("pl-PL")
  )
  const suggestions = useMemo(() => {
    const query = value.trim().toLocaleLowerCase("pl-PL")
    if (!query) return []

    return options
      .map((option, index) => {
        const normalizedOption = option.toLocaleLowerCase("pl-PL")
        const matchIndex = normalizedOption.indexOf(query)
        if (matchIndex < 0) return null

        const beginsWord = matchIndex === 0 || /[\s\-_/]/.test(normalizedOption[matchIndex - 1])
        return { option, index, score: matchIndex === 0 ? 0 : beginsWord ? 1 : 2 }
      })
      .filter((match): match is { option: string; index: number; score: number } => match !== null)
      .sort((first, second) => first.score - second.score || first.index - second.index)
      .map(({ option }) => option)
      .slice(0, 3)
  }, [options, value])
  const showSuggestions = focused && !suggestionWasChosen && suggestions.length > 0

  function chooseSuggestion(suggestion: string) {
    onValueChange(suggestion)
    setSelectedSuggestion(0)
    setSuggestionWasChosen(true)

    const inputId = props.id
    if (typeof inputId === "string") {
      window.requestAnimationFrame(() => document.getElementById(inputId)?.focus())
    }
  }

  function focusSuggestion(index: number) {
    const nextIndex = (index + suggestions.length) % suggestions.length
    setSelectedSuggestion(nextIndex)
    document.getElementById(`${suggestionId}-${nextIndex}`)?.focus()
  }

  return (
    <div
      className="relative"
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div className="flex">
        <Input
          {...props}
          value={value}
          onChange={(event) => {
            setSelectedSuggestion(0)
            setSuggestionWasChosen(false)
            onValueChange(event.target.value)
          }}
          onFocus={(event) => {
            setFocused(true)
            setSelectedSuggestion(0)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            onBlur?.(event)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && showSuggestions) {
              event.preventDefault()
              chooseSuggestion(suggestions[selectedSuggestion] ?? suggestions[0])
              return
            }

            if (showSuggestions && event.key === "ArrowDown") {
              event.preventDefault()
              setSelectedSuggestion((index) => (index + 1) % suggestions.length)
              return
            }

            if (showSuggestions && event.key === "ArrowUp") {
              event.preventDefault()
              setSelectedSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length)
              return
            }

            if (event.key === "Tab" && !event.shiftKey && showSuggestions) {
              event.preventDefault()
              document.getElementById(`${suggestionId}-${selectedSuggestion}`)?.focus()
              return
            }

            if (event.key === "Escape") {
              setSuggestionWasChosen(true)
              return
            }
            onKeyDown?.(event)
          }}
          className={cn("rounded-r-none", className)}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? suggestionId : undefined}
          aria-expanded={showSuggestions}
          aria-activedescendant={showSuggestions ? `${suggestionId}-${selectedSuggestion}` : undefined}
          data-suggestion-input={allowEnterAction ? "true" : undefined}
        />
        <Select
          items={options.map((option) => ({ value: option, label: option }))}
          value={selectedOption ?? null}
          onValueChange={(option) => {
            if (option) chooseSuggestion(option)
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
      {showSuggestions && (
        <div
          id={suggestionId}
          role="listbox"
          className="absolute top-full right-10 left-0 z-50 mt-1 overflow-hidden rounded-md border border-border/80 bg-popover p-1 text-sm shadow-sm"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              id={`${suggestionId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedSuggestion}
              className={cn(
                "flex w-full rounded-sm px-2 py-1.5 text-left transition-colors",
                index === selectedSuggestion
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onMouseDown={(event) => event.preventDefault()}
              onFocus={() => setSelectedSuggestion(index)}
              onMouseEnter={() => setSelectedSuggestion(index)}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault()
                  focusSuggestion(index + (event.shiftKey ? -1 : 1))
                  return
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  focusSuggestion(index + 1)
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  focusSuggestion(index - 1)
                }
              }}
              onClick={() => chooseSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { ConfiguredValueInput }
