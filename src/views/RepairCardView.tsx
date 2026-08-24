import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { format, isValid, parseISO } from "date-fns"
import { pl } from "date-fns/locale"
import { Link, useParams } from "react-router"
import {
  ArrowLeftIcon,
  CalendarIcon,
  CircleAlertIcon,
  FileTextIcon,
  LoaderCircleIcon,
  PlusIcon,
  PrinterIcon,
  SettingsIcon,
  Trash2Icon,
  WandSparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DefaultValueInput } from "@/components/DefaultValueInput"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import {
  getFirmSettings,
  type FirmSettings,
} from "@/features/FirmSettings/api"
import { RepairCardDocument } from "@/features/RepairCard/RepairCardDocument"
import {
  amountToPolishWords,
  createRepairCardData,
  type RepairCardData,
} from "@/features/RepairCard/schema"
import { getServiceRequest } from "@/features/ServiceRequests/api"

const EMPTY_FIRM_SETTINGS: FirmSettings = {
  companyName: "",
  documentFont: "times_new_roman",
}
const DEFAULT_DEVICE_NAME = "Ekspres do kawy"
const DEVICE_NAME_DEFAULT_KEY = "repair-card.device-name"

function FormField({
  id,
  label,
  description,
  children,
}: {
  id: string
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {description && (
        <FieldDescription
          id={id + "-description"}
        >
          {description}
        </FieldDescription>
      )}
    </Field>
  )
}

function IssueDatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const parsedDate = value ? parseISO(value) : undefined
  const selectedDate = parsedDate && isValid(parsedDate) ? parsedDate : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id="repair-card-date"
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selectedDate
          ? format(selectedDate, "PPP", { locale: pl })
          : "Wybierz datę"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "")
            setOpen(false)
          }}
          manualDateInput={{
            value: selectedDate,
            onValueChange: (date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "")
              setOpen(false)
            },
          }}
          locale={pl}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string" && error.trim()) return error
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function RepairCardView() {
  const { id } = useParams<{ id?: string }>()
  const previewRef = useRef<HTMLDivElement>(null)
  const addStepButtonRef = useRef<HTMLButtonElement>(null)
  const stepInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const pendingStepFocusRef = useRef<"last" | number | null>(null)
  const requestId = id === undefined ? null : Number(id)
  const invalidRequestId =
    requestId !== null &&
    (!/^\d+$/.test(id ?? "") ||
      !Number.isSafeInteger(requestId) ||
      requestId <= 0)
  const [settings, setSettings] = useState<FirmSettings>(EMPTY_FIRM_SETTINGS)
  const [data, setData] = useState<RepairCardData>(() =>
    createRepairCardData(EMPTY_FIRM_SETTINGS)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documentTooLong, setDocumentTooLong] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (invalidRequestId) {
      setError("Nieprawid\u0142owy numer zlecenia.")
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError(null)

    const requestPromise =
      requestId === null ? Promise.resolve(null) : getServiceRequest(requestId)

    Promise.all([getFirmSettings(), requestPromise])
      .then(([loadedSettings, request]) => {
        if (cancelled) return

        if (requestId !== null && !request) {
          throw new Error(`Nie znaleziono zlecenia #${requestId}.`)
        }

        setSettings(loadedSettings)
        setData(createRepairCardData(loadedSettings, request))
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            errorMessage(
              loadError,
              requestId === null
                ? "Nie uda\u0142o si\u0119 pobra\u0107 ustawie\u0144 dokumentu."
                : `Nie uda\u0142o si\u0119 przygotowa\u0107 karty dla zlecenia #${requestId}.`
            )
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [invalidRequestId, requestId])

  useLayoutEffect(() => {
    const preview = previewRef.current
    const documentElement = preview?.querySelector<HTMLElement>(
      "[data-repair-card-document]"
    )
    const documentBody = preview?.querySelector<HTMLElement>(
      '[data-repair-card-section="body"]'
    )
    const stamp = preview?.querySelector<HTMLElement>(
      '[data-repair-card-section="stamp"]'
    )

    if (loading || error || !documentElement || !documentBody || !stamp) {
      setDocumentTooLong(false)
      return
    }

    const checkLayout = () => {
      const documentBounds = documentElement.getBoundingClientRect()
      const bodyBounds = documentBody.getBoundingClientRect()
      const stampBounds = stamp.getBoundingClientRect()
      const safetyGap = documentBounds.width * 0.015
      const overflowsPage =
        documentElement.scrollHeight > documentElement.clientHeight + 1 ||
        documentElement.scrollWidth > documentElement.clientWidth + 1
      const overlapsStamp = bodyBounds.bottom + safetyGap > stampBounds.top
      const nextValue = overflowsPage || overlapsStamp

      setDocumentTooLong((current) => (current === nextValue ? current : nextValue))
    }

    const resizeObserver = new ResizeObserver(checkLayout)
    resizeObserver.observe(documentElement)
    resizeObserver.observe(documentBody)
    resizeObserver.observe(stamp)
    const stampImage = stamp.querySelector("img")
    stampImage?.addEventListener("load", checkLayout)
    checkLayout()

    return () => {
      resizeObserver.disconnect()
      stampImage?.removeEventListener("load", checkLayout)
    }
  }, [data, error, loading, settings])

  useEffect(() => {
    const focusTarget = pendingStepFocusRef.current
    if (focusTarget === null) return

    const frame = requestAnimationFrame(() => {
      if (!data.performedActions.length) {
        addStepButtonRef.current?.focus()
      } else {
        const targetIndex =
          focusTarget === "last"
            ? data.performedActions.length - 1
            : Math.min(focusTarget, data.performedActions.length - 1)
        stepInputRefs.current[targetIndex]?.focus()
      }

      pendingStepFocusRef.current = null
    })

    return () => cancelAnimationFrame(frame)
  }, [data.performedActions.length])

  function updateField<Key extends keyof RepairCardData>(
    field: Key,
    value: RepairCardData[Key]
  ) {
    setData((current) => ({ ...current, [field]: value }))
  }

  function addRepairStep() {
    pendingStepFocusRef.current = "last"
    setData((current) => ({
      ...current,
      performedActions: [...current.performedActions, ""],
    }))
  }

  function updateRepairStep(index: number, value: string) {
    setData((current) => ({
      ...current,
      performedActions: current.performedActions.map((step, stepIndex) =>
        stepIndex === index ? value : step
      ),
    }))
  }

  function removeRepairStep(index: number) {
    pendingStepFocusRef.current = index
    setData((current) => ({
      ...current,
      performedActions: current.performedActions.filter(
        (_, stepIndex) => stepIndex !== index
      ),
    }))
  }

  const missingFirmData =
    !settings.companyName.trim() ||
    !settings.street?.trim() ||
    !settings.postalCode?.trim() ||
    !settings.city?.trim()
  const missingStamp = !settings.stampDataUrl
  const generatedAmountInWords = amountToPolishWords(data.amount)

  return (
    <section className="repair-card-view space-y-6 print:block" data-repair-card-view>
      <header className="repair-card-screen-only flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileTextIcon className="size-4" />
            Dokument serwisowy
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Karta naprawy</h1>
          <p className="max-w-2xl text-muted-foreground">
            {requestId === null
              ? "Wprowad\u017a dane dokumentu i sprawd\u017a jego wygl\u0105d przed wydrukiem."
              : `Dane ze zlecenia #${requestId} zosta\u0142y wpisane automatycznie i mo\u017cesz je zmieni\u0107.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {requestId !== null && (
            <Button
              type="button"
              variant="outline"
              nativeButton={false}
              render={<Link to={`/naprawy/${requestId}`} />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Zlecenie
            </Button>
          )}
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={loading || Boolean(error) || documentTooLong}
            title={
              documentTooLong
                ? "Skróć treść karty przed wydrukiem"
                : "Drukuj lub zapisz dokument jako PDF"
            }
          >
            <PrinterIcon data-icon="inline-start" />
            Drukuj lub zapisz PDF
          </Button>
        </div>
      </header>

      {!loading && !error && (missingFirmData || missingStamp) && (
        <div
          role="status"
          className="repair-card-screen-only flex flex-col gap-3 rounded-lg border border-amber-500/35 bg-amber-50 p-4 text-sm text-amber-950 print:hidden dark:bg-amber-950/50 dark:text-amber-100 sm:flex-row sm:items-center"
        >
          <CircleAlertIcon className="size-5 shrink-0 text-amber-600" />
          <p className="mr-auto">
            {missingFirmData && missingStamp
              ? "Uzupe\u0142nij dane firmy i dodaj piecz\u0105tk\u0119, aby dokument by\u0142 kompletny."
              : missingFirmData
                ? "Uzupe\u0142nij dane firmy widoczne w nag\u0142\u00f3wku dokumentu."
                : "Dodaj obraz piecz\u0105tki, aby automatycznie umieszcza\u0107 go na dokumentach."}
          </p>
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link to="/ustawienia/dokumentow" />}
            className="border-amber-600/30 bg-white/60 hover:bg-white dark:bg-transparent"
          >
            <SettingsIcon data-icon="inline-start" />
            Ustawienia dokumentów
          </Button>
        </div>
      )}

      {!loading && !error && documentTooLong && (
        <div
          role="alert"
          className="repair-card-screen-only flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive print:hidden"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            Treść nie mieści się na jednej stronie A4. Skróć opis wykonanych
            czynności lub pozostałe dane przed wydrukiem.
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="repair-card-screen-only flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive print:hidden"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <Card className="repair-card-screen-only print:hidden">
          <CardContent className="flex min-h-72 items-center justify-center gap-2 text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
            Przygotowywanie karty naprawy…
          </CardContent>
        </Card>
      ) : !error ? (
        <div className="repair-card-workspace grid items-start gap-6 xl:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] print:block">
          <Card
            className="repair-card-controls repair-card-screen-only print:hidden xl:sticky xl:top-20"
            data-repair-card-controls
          >
            <CardHeader>
              <CardTitle>Dane karty</CardTitle>
              <CardDescription>
                Każda zmiana jest od razu widoczna w podglądzie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <FormField id="repair-card-place" label="Miejscowość">
                    <Input
                      id="repair-card-place"
                      value={data.issuePlace}
                      onChange={(event) => updateField("issuePlace", event.target.value)}
                      placeholder="np. Wrocław"
                      autoComplete="address-level2"
                    />
                  </FormField>
                  <FormField id="repair-card-date" label="Data wystawienia">
                    <IssueDatePicker
                      value={data.issueDate}
                      onChange={(value) => updateField("issueDate", value)}
                    />
                  </FormField>
                </div>

                <div className="border-t pt-5">
                  <h2 className="mb-4 text-sm font-semibold">Urządzenie</h2>
                  <div className="grid gap-4">
                  <FormField id="repair-card-device-name" label="Nazwa sprzętu">
                      <DefaultValueInput
                        id="repair-card-device-name"
                        value={data.deviceName}
                        onValueChange={(value) => updateField("deviceName", value)}
                        defaultKey={DEVICE_NAME_DEFAULT_KEY}
                        defaultValue={DEFAULT_DEVICE_NAME}
                      />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <FormField id="repair-card-manufacturer" label="Producent">
                        <Input
                          id="repair-card-manufacturer"
                          value={data.manufacturer}
                          onChange={(event) =>
                            updateField("manufacturer", event.target.value)
                          }
                          placeholder="np. HENDI"
                        />
                      </FormField>
                      <FormField id="repair-card-model" label="Model">
                        <Input
                          id="repair-card-model"
                          value={data.model}
                          onChange={(event) => updateField("model", event.target.value)}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-5">
                  <div
                    role="group"
                    aria-labelledby="repair-card-actions-label"
                    aria-describedby="repair-card-actions-description"
                    className="grid min-w-0 gap-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p id="repair-card-actions-label" className="text-sm font-medium">
                          Opis wykonanych czynności
                        </p>
                        <p
                          id="repair-card-actions-description"
                          className="mt-1 text-xs leading-relaxed text-muted-foreground"
                        >
                          Każdy krok ma osobne pole i pojawi się jako oddzielna pozycja
                          na dokumencie.
                        </p>
                      </div>
                      <Button
                        ref={addStepButtonRef}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={addRepairStep}
                      >
                        <PlusIcon data-icon="inline-start" />
                        Dodaj krok
                      </Button>
                    </div>

                    {data.performedActions.length ? (
                      <ol className="grid min-w-0 gap-2">
                        {data.performedActions.map((step, index) => {
                          const inputId = `repair-card-action-${index}`

                          return (
                            <li
                              key={inputId}
                              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"
                            >
                              <span
                                className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                                aria-hidden="true"
                              >
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <FieldLabel className="sr-only" htmlFor={inputId}>
                                  Krok naprawy {index + 1}
                                </FieldLabel>
                                <Input
                                  ref={(element) => {
                                    stepInputRefs.current[index] = element
                                  }}
                                  id={inputId}
                                  value={step}
                                  aria-describedby="repair-card-actions-description"
                                  onChange={(event) =>
                                    updateRepairStep(index, event.target.value)
                                  }
                                  placeholder={`Krok ${index + 1}`}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRepairStep(index)}
                                aria-label={`Usuń krok naprawy ${index + 1}`}
                                title={`Usuń krok ${index + 1}`}
                              >
                                <Trash2Icon />
                              </Button>
                            </li>
                          )
                        })}
                      </ol>
                    ) : (
                      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        Nie dodano jeszcze żadnych kroków naprawy.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 border-t pt-5">
                  <FormField id="repair-card-amount" label="Kwota (PLN)">
                    <Input
                      id="repair-card-amount"
                      value={data.amount}
                      onChange={(event) => updateField("amount", event.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </FormField>
                  <FormField
                    id="repair-card-amount-words"
                    label="Kwota słownie"
                    description="Możesz uzupełnić ją automatycznie z podanej kwoty, a potem dowolnie zmienić."
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                      <Input
                        id="repair-card-amount-words"
                        aria-describedby="repair-card-amount-words-description"
                        value={data.amountInWords}
                        onChange={(event) =>
                          updateField("amountInWords", event.target.value)
                        }
                        placeholder="np. Trzysta trzydzieści złotych"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!generatedAmountInWords}
                        onClick={() =>
                          updateField("amountInWords", generatedAmountInWords)
                        }
                        title="Uzupełnij kwotę słownie"
                        aria-label="Uzupełnij kwotę słownie"
                      >
                        <WandSparklesIcon />
                      </Button>
                    </div>
                  </FormField>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="repair-card-preview-column min-w-0" data-repair-card-preview>
            <div className="repair-card-screen-only mb-3 flex items-center justify-between print:hidden">
              <div>
                <h2 className="text-sm font-semibold">Podgląd wydruku</h2>
                <p className="text-xs text-muted-foreground">Format A4</p>
              </div>
            </div>
            <div
              ref={previewRef}
              className="repair-card-preview-shell overflow-hidden rounded-xl border bg-muted/40 p-3 print:contents sm:p-5"
            >
              <RepairCardDocument data={data} settings={settings} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export { RepairCardView }
