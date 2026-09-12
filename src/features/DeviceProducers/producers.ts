import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

const DEVICE_PRODUCERS_KEY = "configuration.device-producers"
const DEVICE_PRODUCER_ORDER_KEY = "configuration.device-producers-order"
const DEVICE_PRODUCERS_CHANGED_EVENT = "device-producers-changed"
const defaultDeviceProducers = ["Nivona", "Hendi", "Jura", "De'Longhi", "Saeco"]
type DeviceProducerOrder = "alphabetical" | "custom"

function normalizeDeviceProducers(value: unknown) {
  const producers = Array.isArray(value) ? value : []
  const uniqueProducers = new Map<string, string>()

  producers.forEach((producer) => {
    if (typeof producer !== "string") return
    const trimmed = producer.trim()
    if (trimmed) uniqueProducers.set(trimmed.toLocaleLowerCase("pl-PL"), trimmed)
  })

  return [...uniqueProducers.values()]
}

function sortDeviceProducers(producers: string[]) {
  return [...producers].sort((first, second) => first.localeCompare(second, "pl"))
}

function normalizeDeviceProducerOrder(value: unknown): DeviceProducerOrder {
  return value === "custom" ? "custom" : "alphabetical"
}

function orderDeviceProducers(producers: string[], order: DeviceProducerOrder) {
  const normalizedProducers = normalizeDeviceProducers(producers)
  return order === "alphabetical" ? sortDeviceProducers(normalizedProducers) : normalizedProducers
}

function useDeviceProducers() {
  const [producers, setProducers] = useState(() => sortDeviceProducers(defaultDeviceProducers))

  useEffect(() => {
    let cancelled = false
    const loadProducers = () => {
      void Promise.all([
        getInputDefault(DEVICE_PRODUCERS_KEY),
        getInputDefault(DEVICE_PRODUCER_ORDER_KEY),
      ])
        .then(([savedProducers, savedOrder]) => {
          if (cancelled || savedProducers === null) return
          try {
            setProducers(
              orderDeviceProducers(
                JSON.parse(savedProducers),
                normalizeDeviceProducerOrder(savedOrder)
              )
            )
          } catch {
            setProducers(sortDeviceProducers(defaultDeviceProducers))
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

function useDeviceProducerOrder() {
  const [order, setOrder] = useState<DeviceProducerOrder>("alphabetical")

  useEffect(() => {
    let cancelled = false
    const loadOrder = () => {
      void getInputDefault(DEVICE_PRODUCER_ORDER_KEY)
        .then((savedValue) => {
          if (!cancelled) setOrder(normalizeDeviceProducerOrder(savedValue))
        })
        .catch(() => undefined)
    }

    loadOrder()
    window.addEventListener(DEVICE_PRODUCERS_CHANGED_EVENT, loadOrder)
    return () => {
      cancelled = true
      window.removeEventListener(DEVICE_PRODUCERS_CHANGED_EVENT, loadOrder)
    }
  }, [])

  return order
}

async function saveDeviceProducers(
  producers: string[],
  order: DeviceProducerOrder = "alphabetical"
) {
  const normalizedOrder = normalizeDeviceProducerOrder(order)
  const normalizedProducers = orderDeviceProducers(producers, normalizedOrder)
  await saveInputDefault(DEVICE_PRODUCERS_KEY, JSON.stringify(normalizedProducers))
  await saveInputDefault(DEVICE_PRODUCER_ORDER_KEY, normalizedOrder)
  window.dispatchEvent(new Event(DEVICE_PRODUCERS_CHANGED_EVENT))
  return normalizedProducers
}

export {
  defaultDeviceProducers,
  orderDeviceProducers,
  normalizeDeviceProducerOrder,
  normalizeDeviceProducers,
  saveDeviceProducers,
  sortDeviceProducers,
  useDeviceProducerOrder,
  useDeviceProducers,
}

export type { DeviceProducerOrder }
