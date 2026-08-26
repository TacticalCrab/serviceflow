import type { FirmSettings } from "@/features/FirmSettings/api"
import type { ServiceRequest } from "@/features/ServiceRequests/api"
import { finalPrice } from "@/features/ServiceRequests/pricing"

type RepairCardData = {
  issuePlace: string
  issueDate: string
  deviceName: string
  manufacturer: string
  model: string
  additionalInfo: string
  performedActions: string[]
  amount: string
  amountInWords: string
}

const SMALL_NUMBERS = [
  "",
  "jeden",
  "dwa",
  "trzy",
  "cztery",
  "pięć",
  "sześć",
  "siedem",
  "osiem",
  "dziewięć",
] as const
const TEENS = [
  "dziesięć",
  "jedenaście",
  "dwanaście",
  "trzynaście",
  "czternaście",
  "piętnaście",
  "szesnaście",
  "siedemnaście",
  "osiemnaście",
  "dziewiętnaście",
] as const
const TENS = [
  "",
  "",
  "dwadzieścia",
  "trzydzieści",
  "czterdzieści",
  "pięćdziesiąt",
  "sześćdziesiąt",
  "siedemdziesiąt",
  "osiemdziesiąt",
  "dziewięćdziesiąt",
] as const
const HUNDREDS = [
  "",
  "sto",
  "dwieście",
  "trzysta",
  "czterysta",
  "pięćset",
  "sześćset",
  "siedemset",
  "osiemset",
  "dziewięćset",
] as const
const NUMBER_GROUPS = [
  ["", "", ""],
  ["tysiąc", "tysiące", "tysięcy"],
  ["milion", "miliony", "milionów"],
  ["miliard", "miliardy", "miliardów"],
] as const

function polishNounForm(value: number, singular: string, plural: string, genitive: string) {
  const lastTwoDigits = Math.abs(value) % 100
  const lastDigit = lastTwoDigits % 10

  if (Math.abs(value) === 1) return singular
  if (lastTwoDigits >= 12 && lastTwoDigits <= 14) return genitive
  if (lastDigit >= 2 && lastDigit <= 4) return plural
  return genitive
}

function threeDigitNumberToWords(value: number) {
  const words: string[] = []
  const hundreds = Math.floor(value / 100)
  const lastTwoDigits = value % 100

  if (hundreds) words.push(HUNDREDS[hundreds])
  if (lastTwoDigits >= 10 && lastTwoDigits < 20) {
    words.push(TEENS[lastTwoDigits - 10])
  } else {
    const tens = Math.floor(lastTwoDigits / 10)
    const ones = lastTwoDigits % 10
    if (tens) words.push(TENS[tens])
    if (ones) words.push(SMALL_NUMBERS[ones])
  }

  return words.join(" ")
}

function integerToPolishWords(value: number) {
  if (value === 0) return "zero"

  const words: string[] = []
  let remaining = value
  let groupIndex = 0

  while (remaining > 0 && groupIndex < NUMBER_GROUPS.length) {
    const groupValue = remaining % 1000
    if (groupValue) {
      const [singular, plural, genitive] = NUMBER_GROUPS[groupIndex]
      const groupWords =
        groupIndex > 0 && groupValue === 1
          ? singular
          : [
              threeDigitNumberToWords(groupValue),
              groupIndex > 0
                ? polishNounForm(groupValue, singular, plural, genitive)
                : "",
            ]
              .filter(Boolean)
              .join(" ")
      words.unshift(groupWords)
    }

    remaining = Math.floor(remaining / 1000)
    groupIndex += 1
  }

  return words.join(" ")
}

function amountToPolishWords(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")
  if (!normalized) return ""

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0 || amount > 999_999_999_999.99) {
    return ""
  }

  const totalGrosze = Math.round((amount + Number.EPSILON) * 100)
  const zloty = Math.floor(totalGrosze / 100)
  const grosze = totalGrosze % 100
  const words = `${integerToPolishWords(zloty)} ${polishNounForm(
    zloty,
    "złoty",
    "złote",
    "złotych"
  )}`
  const withGrosze = grosze
    ? `${words} i ${integerToPolishWords(grosze)} ${polishNounForm(
        grosze,
        "grosz",
        "grosze",
        "groszy"
      )}`
    : words

  return withGrosze.charAt(0).toLocaleUpperCase("pl-PL") + withGrosze.slice(1)
}

function getTodayInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDocumentDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value.trim()

  const [, year, month, day] = match
  return `${day}.${month}.${year}`
}

function splitPerformedActions(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-\u2013\u2014\u2022]\s*/, ""))
    .filter(Boolean)
}

function normalizePerformedActions(values: readonly string[]) {
  return values.flatMap(splitPerformedActions)
}

function collectServiceRequestActions(request?: ServiceRequest | null) {
  if (!request) return []

  const sourceActions = request.repairSteps ?? []
  const seenActions = new Set<string>()

  return sourceActions.flatMap(splitPerformedActions).filter((action) => {
    const normalizedAction = action.toLocaleLowerCase("pl-PL")
    if (seenActions.has(normalizedAction)) return false

    seenActions.add(normalizedAction)
    return true
  })
}

function formatAmountForDocument(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const normalized = trimmed.replace(/\s/g, "").replace(",", ".")
  const amount = Number(normalized)

  if (!Number.isFinite(amount)) return trimmed

  return `${new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)} z\u0142`
}

function editableAmount(value: number) {
  return String(Math.round((value + Number.EPSILON) * 100) / 100)
}

function createRepairCardData(
  settings: FirmSettings,
  request?: ServiceRequest | null
): RepairCardData {
  const calculatedFinalPrice = request
    ? finalPrice(request.costEstimate, request.additionalCosts)
    : undefined
  const amount = calculatedFinalPrice !== undefined ? editableAmount(calculatedFinalPrice) : ""

  return {
    issuePlace: settings.city?.trim() ?? "",
    issueDate: getTodayInputValue(),
    deviceName: request?.device.name ?? "",
    manufacturer: request?.device.manufacturer ?? "",
    model: request?.device.model ?? "",
    additionalInfo: "",
    performedActions: collectServiceRequestActions(request),
    amount,
    amountInWords: amountToPolishWords(amount),
  }
}

export {
  amountToPolishWords,
  collectServiceRequestActions,
  createRepairCardData,
  formatAmountForDocument,
  formatDocumentDate,
  getTodayInputValue,
  normalizePerformedActions,
  splitPerformedActions,
}
export type { RepairCardData }
