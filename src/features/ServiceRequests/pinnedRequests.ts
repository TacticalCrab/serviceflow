const PINNED_REQUESTS_STORAGE_KEY = "cafe-service.pinned-request-ids"
const PINNED_REQUESTS_CHANGED_EVENT = "pinned-requests-changed"

function getPinnedRequestIds() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(PINNED_REQUESTS_STORAGE_KEY) ?? "[]")
    return Array.isArray(value)
      ? value.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0)
      : []
  } catch {
    return []
  }
}

function isRequestPinned(id: number) {
  return getPinnedRequestIds().includes(id)
}

function setRequestPinned(id: number, pinned: boolean) {
  const current = getPinnedRequestIds()
  const next = pinned
    ? [id, ...current.filter((currentId) => currentId !== id)].slice(0, 12)
    : current.filter((currentId) => currentId !== id)
  window.localStorage.setItem(PINNED_REQUESTS_STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(PINNED_REQUESTS_CHANGED_EVENT))
}

export { getPinnedRequestIds, isRequestPinned, setRequestPinned, PINNED_REQUESTS_CHANGED_EVENT }
