import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const ADDITIONAL_COST_HINTS_KEY = "configuration.additional-cost-hints"
const ADDITIONAL_COST_HINTS_CHANGED_EVENT = "additional-cost-hints-changed"
const defaultAdditionalCostHints = [
  "Wymiana uszczelki",
  "Środek czyszczący",
  "Wymiana zaworu",
]

function normalizeAdditionalCostHints(value: unknown) {
  const hints = Array.isArray(value) ? value : []
  const uniqueHints = new Map<string, string>()

  hints.forEach((hint) => {
    if (typeof hint !== "string") return
    const trimmed = hint.trim()
    if (trimmed) uniqueHints.set(trimmed.toLocaleLowerCase("pl-PL"), trimmed)
  })

  return [...uniqueHints.values()]
}

function useAdditionalCostHints() {
  const [hints, setHints] = useState(defaultAdditionalCostHints)

  useEffect(() => {
    let cancelled = false
    const loadHints = () => {
      void getInputDefault(ADDITIONAL_COST_HINTS_KEY)
        .then((savedValue) => {
          if (cancelled || savedValue === null) return
          try {
            setHints(normalizeAdditionalCostHints(JSON.parse(savedValue)))
          } catch {
            setHints(defaultAdditionalCostHints)
          }
        })
        .catch(() => undefined)
    }

    loadHints()
    window.addEventListener(ADDITIONAL_COST_HINTS_CHANGED_EVENT, loadHints)
    return () => {
      cancelled = true
      window.removeEventListener(ADDITIONAL_COST_HINTS_CHANGED_EVENT, loadHints)
    }
  }, [])

  return hints
}

async function saveAdditionalCostHints(hints: string[]) {
  const normalizedHints = normalizeAdditionalCostHints(hints)
  await saveInputDefault(ADDITIONAL_COST_HINTS_KEY, JSON.stringify(normalizedHints))
  window.dispatchEvent(new Event(ADDITIONAL_COST_HINTS_CHANGED_EVENT))
  return normalizedHints
}

export {
  normalizeAdditionalCostHints,
  saveAdditionalCostHints,
  useAdditionalCostHints,
}
