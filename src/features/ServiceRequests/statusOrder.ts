import { useEffect, useState } from "react"

import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"

import { serviceStatusOptions } from "./status"
import type { ServiceStatus } from "./api"

const STATUS_ORDER_KEY = "configuration.status-order"
const STATUS_ORDER_CHANGED_EVENT = "service-status-order-changed"
const defaultStatusOrder = serviceStatusOptions.map((status) => status.value)

function normalizeStatusOrder(value: unknown): ServiceStatus[] {
  const savedOrder = Array.isArray(value) ? value : []
  const validStatuses = new Set(defaultStatusOrder)
  const uniqueSavedStatuses = savedOrder.filter(
    (status): status is ServiceStatus =>
      typeof status === "string" && validStatuses.has(status as ServiceStatus)
  )

  return [...new Set([...uniqueSavedStatuses, ...defaultStatusOrder])]
}

function useStatusOrder() {
  const [order, setOrder] = useState<ServiceStatus[]>(defaultStatusOrder)

  useEffect(() => {
    let cancelled = false

    const loadOrder = () => {
      void getInputDefault(STATUS_ORDER_KEY)
        .then((savedValue) => {
          if (cancelled || !savedValue) return
          try {
            setOrder(normalizeStatusOrder(JSON.parse(savedValue)))
          } catch {
            setOrder(defaultStatusOrder)
          }
        })
        .catch(() => undefined)
    }

    loadOrder()
    window.addEventListener(STATUS_ORDER_CHANGED_EVENT, loadOrder)
    return () => {
      cancelled = true
      window.removeEventListener(STATUS_ORDER_CHANGED_EVENT, loadOrder)
    }
  }, [])

  return order
}

function useOrderedServiceStatuses() {
  const order = useStatusOrder()
  const statusByValue = new Map(serviceStatusOptions.map((status) => [status.value, status]))

  return order.flatMap((status) => {
    const option = statusByValue.get(status)
    return option ? [option] : []
  })
}

async function saveStatusOrder(order: ServiceStatus[]) {
  const normalizedOrder = normalizeStatusOrder(order)
  await saveInputDefault(STATUS_ORDER_KEY, JSON.stringify(normalizedOrder))
  window.dispatchEvent(new Event(STATUS_ORDER_CHANGED_EVENT))
}

export { saveStatusOrder, useOrderedServiceStatuses, useStatusOrder }
