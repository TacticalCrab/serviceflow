import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const REPAIRS_PER_PAGE_KEY = "configuration.repairs-per-page"
const REPAIRS_PER_PAGE_CHANGED_EVENT = "repairs-per-page-changed"
const DEFAULT_REPAIRS_PER_PAGE = 15
const repairsPerPageOptions = [10, 15, 25, 50, 100] as const

function normalizeRepairsPerPage(value: unknown) {
  const perPage = typeof value === "number" ? value : Number(value)
  return repairsPerPageOptions.includes(perPage as (typeof repairsPerPageOptions)[number])
    ? perPage
    : DEFAULT_REPAIRS_PER_PAGE
}

function useRepairsPerPage() {
  const [perPage, setPerPage] = useState(DEFAULT_REPAIRS_PER_PAGE)

  useEffect(() => {
    let cancelled = false
    const loadSetting = () => {
      void getInputDefault(REPAIRS_PER_PAGE_KEY)
        .then((savedValue) => {
          if (!cancelled) setPerPage(normalizeRepairsPerPage(savedValue))
        })
        .catch(() => {
          if (!cancelled) setPerPage(DEFAULT_REPAIRS_PER_PAGE)
        })
    }

    loadSetting()
    window.addEventListener(REPAIRS_PER_PAGE_CHANGED_EVENT, loadSetting)
    return () => {
      cancelled = true
      window.removeEventListener(REPAIRS_PER_PAGE_CHANGED_EVENT, loadSetting)
    }
  }, [])

  return perPage
}

async function saveRepairsPerPage(perPage: number) {
  const normalizedPerPage = normalizeRepairsPerPage(perPage)
  await saveInputDefault(REPAIRS_PER_PAGE_KEY, String(normalizedPerPage))
  window.dispatchEvent(new Event(REPAIRS_PER_PAGE_CHANGED_EVENT))
  return normalizedPerPage
}

export {
  DEFAULT_REPAIRS_PER_PAGE,
  normalizeRepairsPerPage,
  repairsPerPageOptions,
  saveRepairsPerPage,
  useRepairsPerPage,
}
