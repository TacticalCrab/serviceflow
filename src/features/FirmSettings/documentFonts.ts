const DOCUMENT_FONT_VALUES = [
  "times_new_roman",
  "georgia",
  "arial",
  "geist",
] as const

type DocumentFont = (typeof DOCUMENT_FONT_VALUES)[number]

type DocumentFontOption = {
  value: DocumentFont
  label: string
  description: string
  fontFamily: string
}

const DEFAULT_DOCUMENT_FONT: DocumentFont = "times_new_roman"

const DOCUMENT_FONT_OPTIONS: readonly DocumentFontOption[] = [
  {
    value: "times_new_roman",
    label: "Times New Roman",
    description: "Najbliższy wzorowi Karty Naprawy",
    fontFamily: '"Times New Roman", Times, serif',
  },
  {
    value: "georgia",
    label: "Georgia",
    description: "Klasyczny krój szeryfowy",
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    value: "arial",
    label: "Arial",
    description: "Prosty krój bezszeryfowy",
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  },
  {
    value: "geist",
    label: "Geist",
    description: "Nowoczesny krój aplikacji",
    fontFamily: '"Geist Variable", "Segoe UI", sans-serif',
  },
]

function isDocumentFont(value: unknown): value is DocumentFont {
  return DOCUMENT_FONT_VALUES.some((font) => font === value)
}

function normalizeDocumentFont(value: unknown): DocumentFont {
  return isDocumentFont(value) ? value : DEFAULT_DOCUMENT_FONT
}

function getDocumentFontFamily(value: unknown) {
  const font = normalizeDocumentFont(value)
  return (
    DOCUMENT_FONT_OPTIONS.find((option) => option.value === font)?.fontFamily ??
    DOCUMENT_FONT_OPTIONS[0].fontFamily
  )
}

export {
  DEFAULT_DOCUMENT_FONT,
  DOCUMENT_FONT_OPTIONS,
  DOCUMENT_FONT_VALUES,
  getDocumentFontFamily,
  isDocumentFont,
  normalizeDocumentFont,
}
export type { DocumentFont, DocumentFontOption }
