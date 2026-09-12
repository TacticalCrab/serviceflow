import { useEffect, useState } from "react"

const REPAIRS_TABLE_COLUMNS = [
  ["status", "Status"], ["customer", "Klient"], ["phone", "Telefon"],
  ["device", "Urządzenie"], ["manufacturer", "Producent"], ["model", "Model"],
  ["serialNumber", "Numer seryjny"], ["defect", "Opis usterki"],
  ["repairTime", "Czas naprawy"], ["estimate", "Kwota końcowa"],
  ["additionalCosts", "Wydatki"], ["profit", "Zysk"], ["checkIn", "Przyjęcie"], ["checkOut", "Zwrot"],
  ["repairCard", "Karta naprawy"], ["invoice", "Faktura"],
  ["createdAt", "Utworzono"], ["statusChangedAt", "Zmiana statusu"], ["endedAt", "Zakończono"],
] as const

type RepairsTableColumn = (typeof REPAIRS_TABLE_COLUMNS)[number][0]
const defaultRepairsTableColumnOrder = REPAIRS_TABLE_COLUMNS.map(([id]) => id)
const REPAIRS_TABLE_COLUMN_ORDER_KEY = "cafe-service.repairs-table-column-order"
const REPAIRS_TABLE_COLUMN_ORDER_CHANGED_EVENT = "repairs-table-column-order-changed"

function normalizeRepairsTableColumnOrder(value: unknown): RepairsTableColumn[] {
  const storedOrder = Array.isArray(value) ? value : []
  const validIds = new Set(defaultRepairsTableColumnOrder)
  const ordered = storedOrder.filter(
    (column): column is RepairsTableColumn => typeof column === "string" && validIds.has(column as RepairsTableColumn)
  )
  return [...new Set([...ordered, ...defaultRepairsTableColumnOrder])]
}

function useRepairsTableColumnOrder() {
  const [order, setOrder] = useState(defaultRepairsTableColumnOrder)
  useEffect(() => {
    const loadOrder = () => {
      try {
        setOrder(normalizeRepairsTableColumnOrder(JSON.parse(window.localStorage.getItem(REPAIRS_TABLE_COLUMN_ORDER_KEY) ?? "[]")))
      } catch { setOrder(defaultRepairsTableColumnOrder) }
    }
    loadOrder()
    window.addEventListener(REPAIRS_TABLE_COLUMN_ORDER_CHANGED_EVENT, loadOrder)
    return () => window.removeEventListener(REPAIRS_TABLE_COLUMN_ORDER_CHANGED_EVENT, loadOrder)
  }, [])
  return order
}

function saveRepairsTableColumnOrder(order: RepairsTableColumn[]) {
  const normalized = normalizeRepairsTableColumnOrder(order)
  window.localStorage.setItem(REPAIRS_TABLE_COLUMN_ORDER_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new Event(REPAIRS_TABLE_COLUMN_ORDER_CHANGED_EVENT))
  return normalized
}

export { defaultRepairsTableColumnOrder, REPAIRS_TABLE_COLUMNS, saveRepairsTableColumnOrder, useRepairsTableColumnOrder }
export type { RepairsTableColumn }
