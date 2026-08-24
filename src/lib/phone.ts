function formatPhoneNumber(value: string | undefined) {
  if (!value) return ""

  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return trimmed

  const hasPolishPrefix = trimmed.startsWith("+48") || trimmed.startsWith("0048")
  const localNumber = hasPolishPrefix
    ? digits.slice(trimmed.startsWith("0048") ? 4 : 2)
    : digits
  const groups = localNumber.match(/.{1,3}/g)?.join(" ") ?? ""

  return hasPolishPrefix ? `+48${groups ? ` ${groups}` : ""}` : groups
}

export { formatPhoneNumber }
