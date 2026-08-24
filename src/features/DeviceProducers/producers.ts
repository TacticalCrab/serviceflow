import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const DEVICE_PRODUCERS_KEY = "configuration.device-producers"
const DEVICE_PRODUCERS_CHANGED_EVENT = "device-producers-changed"
const defaultDeviceProducers = ["Nivona", "Hendi", "Jura", "De'Longhi", "Saeco"]

function normalizeDeviceProducers(value: unknown) {
  const producers = Array.isArray(value) ? value : []
  const uniqueProducers = new Map<string, string>()

  producers.forEach((producer) => {
    if (typeof producer !== "string") return
    const trimmed = producer.trim()
    if (trimmed) uniqueProducers.set(trimmed.toLocaleLowerCase("pl-PL"), trimmed)
  })

  return [...uniqueProducers.values()].sort((first, second) =>
    first.localeCompare(second, "pl")
  )
}

function useDeviceProducers() {
  const [producers, setProducers] = useState(defaultDeviceProducers)

  useEffect(() => {
    let cancelled = false
    const loadProducers = () => {
      void getInputDefault(DEVICE_PRODUCERS_KEY)
        .then((savedValue) => {
          if (cancelled || savedValue === null) return
          try {
            setProducers(normalizeDeviceProducers(JSON.parse(savedValue)))
          } catch {
            setProducers(defaultDeviceProducers)
          }
        })
        .catch(() => undefined)
    }

    loadProducers()
    window.addEventListener(DEVICE_PRODUCERS_CHANGED_EVENT, loadProducers)
    return () => {
      cancelled = true
      window.removeEventListener(DEVICE_PRODUCERS_CHANGED_EVENT, loadProducers)
    }
  }, [])

  return producers
}

async function saveDeviceProducers(producers: string[]) {
  const normalizedProducers = normalizeDeviceProducers(producers)
  await saveInputDefault(DEVICE_PRODUCERS_KEY, JSON.stringify(normalizedProducers))
  window.dispatchEvent(new Event(DEVICE_PRODUCERS_CHANGED_EVENT))
  return normalizedProducers
}

export {
  defaultDeviceProducers,
  normalizeDeviceProducers,
  saveDeviceProducers,
  useDeviceProducers,
}
