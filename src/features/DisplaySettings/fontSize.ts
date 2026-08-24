import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const APP_FONT_SIZE_KEY = "configuration.app-font-size"
const APP_FONT_SIZE_CHANGED_EVENT = "app-font-size-changed"
const DEFAULT_APP_FONT_SIZE = 16
const appFontSizeOptions = [14, 16, 18, 20, 24, 26, 30] as const

function normalizeAppFontSize(value: unknown) {
  const fontSize = typeof value === "number" ? value : Number(value)
  return appFontSizeOptions.includes(fontSize as (typeof appFontSizeOptions)[number])
    ? fontSize
    : DEFAULT_APP_FONT_SIZE
}

function applyAppFontSize(fontSize: number) {
  document.documentElement.style.fontSize = `${normalizeAppFontSize(fontSize)}px`
}

function useAppFontSize() {
  const [fontSize, setFontSize] = useState(DEFAULT_APP_FONT_SIZE)

  useEffect(() => {
    let cancelled = false
    const loadFontSize = () => {
      void getInputDefault(APP_FONT_SIZE_KEY)
        .then((savedValue) => {
          if (cancelled) return
          const nextFontSize = normalizeAppFontSize(savedValue)
          setFontSize(nextFontSize)
          applyAppFontSize(nextFontSize)
        })
        .catch(() => applyAppFontSize(DEFAULT_APP_FONT_SIZE))
    }

    loadFontSize()
    window.addEventListener(APP_FONT_SIZE_CHANGED_EVENT, loadFontSize)
    return () => {
      cancelled = true
      window.removeEventListener(APP_FONT_SIZE_CHANGED_EVENT, loadFontSize)
    }
  }, [])

  return fontSize
}

async function saveAppFontSize(fontSize: number) {
  const normalizedFontSize = normalizeAppFontSize(fontSize)
  await saveInputDefault(APP_FONT_SIZE_KEY, String(normalizedFontSize))
  applyAppFontSize(normalizedFontSize)
  window.dispatchEvent(new Event(APP_FONT_SIZE_CHANGED_EVENT))
  return normalizedFontSize
}

export {
  appFontSizeOptions,
  DEFAULT_APP_FONT_SIZE,
  normalizeAppFontSize,
  saveAppFontSize,
  useAppFontSize,
}
