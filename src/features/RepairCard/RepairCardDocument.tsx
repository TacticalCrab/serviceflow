import type { ReactNode } from "react"

import type { FirmSettings } from "@/features/FirmSettings/api"
import { getDocumentFontFamily } from "@/features/FirmSettings/documentFonts"
import {
  formatAmountForDocument,
  formatDocumentDate,
  normalizePerformedActions,
  type RepairCardData,
} from "@/features/RepairCard/schema"

type RepairCardDocumentProps = {
  data: RepairCardData
  settings: FirmSettings
}

function DocumentRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="repair-card-row grid grid-cols-[25cqw_minmax(0,1fr)] gap-x-[1.5cqw]">
      <dt className="font-semibold whitespace-nowrap">{label}</dt>
      <dd className="min-w-0 break-words">{children || "\u00a0"}</dd>
    </div>
  )
}

function RepairCardDocument({ data, settings }: RepairCardDocumentProps) {
  const date = formatDocumentDate(data.issueDate)
  const placeAndDate = [data.issuePlace.trim(), date].filter(Boolean).join(" ")
  const postalCity =
    settings.postalCode?.trim() && settings.city?.trim()
      ? `${settings.postalCode.trim()}, ${settings.city.trim()}`
      : [settings.postalCode?.trim(), settings.city?.trim()].filter(Boolean).join(" ")
  const headerLines = [
    settings.companyName.trim(),
    settings.ownerName?.trim(),
    settings.street?.trim(),
    postalCity,
    settings.taxId?.trim() ? `NIP: ${settings.taxId.trim()}` : undefined,
    settings.phone?.trim() ? `tel.: ${settings.phone.trim()}` : undefined,
    settings.email?.trim() ? `e-mail: ${settings.email.trim()}` : undefined,
  ].filter(Boolean)
  const actions = normalizePerformedActions(data.performedActions)

  return (
    <article
      className="repair-card-document relative mx-auto aspect-[210/297] w-full max-w-[210mm] overflow-hidden bg-white text-black shadow-xl print:m-0 print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none [container-type:inline-size]"
      style={{
        fontFamily: getDocumentFontFamily(settings.documentFont),
        fontSize: "16px",
      }}
      data-repair-card-document
      aria-label="Podgląd karty naprawy"
    >
      <div className="absolute inset-0 px-[8.8cqw] pt-[7.4cqw] pb-[8.8cqw]">
        <header
          className="repair-card-document-header grid min-h-[16cqw] grid-cols-2 gap-[5cqw] font-semibold [font-size:1.85cqw] [line-height:1.22]"
          data-repair-card-section="header"
        >
          <div className="min-w-0">
            {headerLines.map((line, index) => (
              <div key={`${line}-${index}`} className="break-words">
                {line}
              </div>
            ))}
          </div>
          <div className="text-right">{placeAndDate}</div>
        </header>

        <h1
          className="repair-card-document-title mt-[8.5cqw] text-center font-bold [font-size:3cqw] [line-height:1.15]"
          data-repair-card-section="title"
        >
          Karta naprawy
        </h1>

        <main
          className="repair-card-document-body ml-[6cqw] mt-[10.5cqw] [font-size:2.12cqw] [line-height:1.36]"
          data-repair-card-section="body"
        >
          <dl
            className="repair-card-device-details grid gap-y-[0.65cqw]"
            data-repair-card-section="device"
          >
            <DocumentRow label="Nazwa sprzętu:">{data.deviceName.trim()}</DocumentRow>
            <DocumentRow label="Producent:">{data.manufacturer.trim()}</DocumentRow>
            <DocumentRow label="Model:">{data.model.trim()}</DocumentRow>
          </dl>

          <section
            className="repair-card-actions mt-[6.5cqw] grid grid-cols-[25cqw_minmax(0,1fr)] gap-x-[1.5cqw] gap-y-[0.45cqw]"
            data-repair-card-section="actions"
          >
            <h2 className="col-span-2 font-semibold whitespace-nowrap [font-size:inherit]">
              Opis wykonanych czynności:
            </h2>
            <ul className="col-start-2 grid min-w-0 gap-y-[0.45cqw]">
              {actions.length ? (
                actions.map((action, index) => (
                  <li
                    key={`${action}-${index}`}
                    className="grid min-w-0 grid-cols-[1cqw_minmax(0,1fr)] items-start gap-x-[0.55cqw]"
                  >
                    <span aria-hidden="true">-</span>
                    <span className="min-w-0 break-words">{action}</span>
                  </li>
                ))
              ) : (
                <li aria-hidden="true" className="grid grid-cols-[1cqw_minmax(0,1fr)]">
                  <span>{"\u00a0"}</span>
                  <span>{"\u00a0"}</span>
                </li>
              )}
            </ul>
          </section>

          <dl
            className="repair-card-amount mt-[5cqw] grid gap-y-[1.8cqw]"
            data-repair-card-section="amount"
          >
            <DocumentRow label="Kwota">
              {formatAmountForDocument(data.amount)}
            </DocumentRow>
            <DocumentRow label="Słownie">{data.amountInWords.trim()}</DocumentRow>
          </dl>
        </main>

        <footer
          className="repair-card-stamp absolute right-[8.8cqw] bottom-[10.5cqw] w-[31cqw] text-center"
          data-repair-card-section="stamp"
        >
          {settings.stampDataUrl ? (
            <img
              src={settings.stampDataUrl}
              alt={`Piecz\u0105tka ${settings.companyName || "firmy"}`}
              className="mx-auto max-h-[20cqw] w-full object-contain object-bottom"
              data-repair-card-stamp-image
            />
          ) : (
            <div
              className="mx-auto h-[10cqw] w-[27cqw] border-b border-dotted border-black"
              aria-hidden="true"
              data-repair-card-stamp-placeholder
            />
          )}
          <p className="mt-[1.5cqw] font-semibold [font-size:1.65cqw] [line-height:1.2]">
            Podpis i pieczątka serwisu
          </p>
        </footer>
      </div>
    </article>
  )
}

export { RepairCardDocument }
export type { RepairCardDocumentProps }
