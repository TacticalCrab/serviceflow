import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const SERVICE_STEPS_KEY = "configuration.service-steps"
const SERVICE_STEPS_CHANGED_EVENT = "service-steps-changed"
const defaultServiceSteps = ["Diagnostyka", "Czyszczenie i konserwacja", "Test działania"]

function normalizeServiceSteps(value: unknown) {
  const steps = Array.isArray(value) ? value : []
  const uniqueSteps = new Map<string, string>()

  steps.forEach((step) => {
    if (typeof step !== "string") return
    const trimmed = step.trim()
    if (trimmed) uniqueSteps.set(trimmed.toLocaleLowerCase("pl-PL"), trimmed)
  })

  return [...uniqueSteps.values()]
}

function useServiceSteps() {
  const [steps, setSteps] = useState(defaultServiceSteps)

  useEffect(() => {
    let cancelled = false
    const loadSteps = () => {
      void getInputDefault(SERVICE_STEPS_KEY)
        .then((savedValue) => {
          if (cancelled || savedValue === null) return
          try {
            setSteps(normalizeServiceSteps(JSON.parse(savedValue)))
          } catch {
            setSteps(defaultServiceSteps)
          }
        })
        .catch(() => undefined)
    }

    loadSteps()
    window.addEventListener(SERVICE_STEPS_CHANGED_EVENT, loadSteps)
    return () => {
      cancelled = true
      window.removeEventListener(SERVICE_STEPS_CHANGED_EVENT, loadSteps)
    }
  }, [])

  return steps
}

async function saveServiceSteps(steps: string[]) {
  const normalizedSteps = normalizeServiceSteps(steps)
  await saveInputDefault(SERVICE_STEPS_KEY, JSON.stringify(normalizedSteps))
  window.dispatchEvent(new Event(SERVICE_STEPS_CHANGED_EVENT))
  return normalizedSteps
}

export { normalizeServiceSteps, saveServiceSteps, useServiceSteps }
