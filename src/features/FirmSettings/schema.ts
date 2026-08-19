import * as z from "zod"

import {
  DOCUMENT_FONT_VALUES,
  normalizeDocumentFont,
} from "@/features/FirmSettings/documentFonts"

const firmSettingsSchema = z.object({
  companyName: z.string().trim().min(1, "Nazwa firmy jest wymagana"),
  ownerName: z.string().trim().optional(),
  street: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  city: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.email("Nieprawidłowy adres e-mail").optional(),
  documentFont: z.enum(DOCUMENT_FONT_VALUES),
  stampDataUrl: z.string().nullable().optional(),
})

type FirmSettings = z.infer<typeof firmSettingsSchema>

function createFirmSettingsValues(
  settings?: Partial<FirmSettings> | null
): FirmSettings {
  return {
    companyName: settings?.companyName ?? "",
    ownerName: settings?.ownerName,
    street: settings?.street,
    postalCode: settings?.postalCode,
    city: settings?.city,
    taxId: settings?.taxId,
    phone: settings?.phone,
    email: settings?.email,
    documentFont: normalizeDocumentFont(settings?.documentFont),
    stampDataUrl: settings?.stampDataUrl ?? undefined,
  }
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function prepareFirmSettingsForSave(settings: FirmSettings): FirmSettings {
  return {
    companyName: settings.companyName.trim(),
    ownerName: normalizeOptionalText(settings.ownerName),
    street: normalizeOptionalText(settings.street),
    postalCode: normalizeOptionalText(settings.postalCode),
    city: normalizeOptionalText(settings.city),
    taxId: normalizeOptionalText(settings.taxId),
    phone: normalizeOptionalText(settings.phone),
    email: normalizeOptionalText(settings.email),
    documentFont: settings.documentFont,
    stampDataUrl: settings.stampDataUrl ?? null,
  }
}

export {
  createFirmSettingsValues,
  firmSettingsSchema,
  prepareFirmSettingsForSave,
}
export type { FirmSettings }
