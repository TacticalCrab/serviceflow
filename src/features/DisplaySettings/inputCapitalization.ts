import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const INPUT_CAPITALIZATION_KEY = "configuration.capitalize-input-first-letter"
const INPUT_CAPITALIZATION_CHANGED_EVENT = "input-capitalization-changed"
const DEFAULT_INPUT_CAPITALIZATION = false

function normalizeInputCapitalization(value: unknown) {
  return value === true || value === "true"
}

function applyInputCapitalization(enabled: boolean) {
  document.documentElement.dataset.capitalizeInputFirstLetter = enabled ? "true" : "false"
}

function useInputCapitalization() {
  const [enabled, setEnabled] = useState(DEFAULT_INPUT_CAPITALIZATION)

  useEffect(() => {
    let cancelled = false
    const loadSetting = () => {
      void getInputDefault(INPUT_CAPITALIZATION_KEY)
        .then((savedValue) => {
          if (cancelled) return
          const nextEnabled = normalizeInputCapitalization(savedValue)
          setEnabled(nextEnabled)
          applyInputCapitalization(nextEnabled)
        })
        .catch(() => applyInputCapitalization(DEFAULT_INPUT_CAPITALIZATION))
    }

    loadSetting()
    window.addEventListener(INPUT_CAPITALIZATION_CHANGED_EVENT, loadSetting)
    return () => {
      cancelled = true
      window.removeEventListener(INPUT_CAPITALIZATION_CHANGED_EVENT, loadSetting)
    }
  }, [])

  return enabled
}

async function saveInputCapitalization(enabled: boolean) {
  const normalizedEnabled = Boolean(enabled)
  await saveInputDefault(INPUT_CAPITALIZATION_KEY, String(normalizedEnabled))
  applyInputCapitalization(normalizedEnabled)
  window.dispatchEvent(new Event(INPUT_CAPITALIZATION_CHANGED_EVENT))
  return normalizedEnabled
}

function capitalizeFirstInputLetter(value: string) {
  if (document.documentElement.dataset.capitalizeInputFirstLetter !== "true") {
    return value
  }

  return value.replace(/^(\s*)(\p{L})/u, (_, whitespace: string, letter: string) =>
    `${whitespace}${letter.toLocaleUpperCase("pl-PL")}`
  )
}

export {
  capitalizeFirstInputLetter,
  DEFAULT_INPUT_CAPITALIZATION,
  saveInputCapitalization,
  useInputCapitalization,
}
