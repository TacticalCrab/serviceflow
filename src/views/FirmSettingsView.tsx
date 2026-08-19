import { useEffect, useRef, useState } from "react"
import { useForm } from "@tanstack/react-form"
import {
  Building2Icon,
  CheckCircle2Icon,
  CircleAlertIcon,
  ImageIcon,
  LoaderCircleIcon,
  SaveIcon,
  Trash2Icon,
  TypeIcon,
  UploadIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getFirmSettings, saveFirmSettings } from "@/features/FirmSettings/api"
import {
  DOCUMENT_FONT_OPTIONS,
  getDocumentFontFamily,
  isDocumentFont,
} from "@/features/FirmSettings/documentFonts"
import {
  createFirmSettingsValues,
  firmSettingsSchema,
  prepareFirmSettingsForSave,
} from "@/features/FirmSettings/schema"

const MAX_STAMP_FILE_SIZE = 2 * 1024 * 1024
const ACCEPTED_STAMP_TYPES = new Set(["image/png", "image/jpeg", "image/webp"])
const DOCUMENT_FONT_SELECT_ITEMS = DOCUMENT_FONT_OPTIONS.map(({ label, value }) => ({
  label,
  value,
}))

function optionalText(value: string) {
  return value === "" ? undefined : value
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "string") return error
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Nie udało się odczytać wybranego obrazu."))
      }
    })
    reader.addEventListener("error", () => {
      reject(new Error("Nie udało się odczytać wybranego obrazu."))
    })
    reader.readAsDataURL(file)
  })
}

function FirmSettingsView() {
  const stampInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [readingStamp, setReadingStamp] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formDefaults, setFormDefaults] = useState(createFirmSettingsValues)

  const form = useForm({
    defaultValues: formDefaults,
    validators: {
      onSubmit: firmSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      setSaveError(null)
      setSaved(false)

      try {
        const savedSettings = await saveFirmSettings(
          prepareFirmSettingsForSave(value)
        )
        const nextDefaults = createFirmSettingsValues(savedSettings)
        setFormDefaults(nextDefaults)
        formApi.reset(nextDefaults)
        setSaved(true)
      } catch (error) {
        setSaveError(
          errorMessage(
            error,
            "Nie udało się zapisać ustawień firmy. Spróbuj ponownie."
          )
        )
        throw error
      }
    },
  })

  useEffect(() => {
    let cancelled = false

    getFirmSettings()
      .then((settings) => {
        if (!cancelled) {
          const nextDefaults = createFirmSettingsValues(settings)
          setFormDefaults(nextDefaults)
          form.reset(nextDefaults)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            errorMessage(
              error,
              "Nie udało się pobrać ustawień firmy. Możesz uzupełnić je poniżej."
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
  }, [form])

  if (loading) {
    return (
      <section className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Dokumenty</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dane firmy</h1>
          <p className="max-w-2xl text-muted-foreground">
            Skonfiguruj informacje używane na dokumentach serwisowych.
          </p>
        </header>

        <Card>
          <CardContent className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Pobieranie ustawień firmy…
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Dokumenty</p>
        <h1 className="text-3xl font-semibold tracking-tight">Dane firmy</h1>
        <p className="max-w-2xl text-muted-foreground">
          Dane zapisane tutaj będą automatycznie umieszczane w nagłówku generowanych
          dokumentów serwisowych.
        </p>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form.Subscribe selector={(state) => state.isDirty}>
        {(isDirty) =>
          saved && !isDirty ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2Icon className="size-4 shrink-0" />
              Ustawienia firmy zostały zapisane.
            </div>
          ) : null
        }
      </form.Subscribe>

      <form
        className="space-y-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit().catch(() => undefined)
        }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2Icon className="size-5" />
              </span>
              <div className="space-y-1">
                <CardTitle>Dane identyfikacyjne i kontaktowe</CardTitle>
                <CardDescription>
                  Uzupełnij dane dokładnie w takiej postaci, w jakiej mają pojawiać się
                  na dokumentach.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-7">
            <FieldSet>
              <FieldLegend>Dane firmy</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="companyName">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field className="sm:col-span-2" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Nazwa firmy <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          required
                          aria-required="true"
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={isInvalid}
                          autoComplete="organization"
                          placeholder="Np. Cafe Serwis Jan Kowalski"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="ownerName">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Właściciel / osoba reprezentująca</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          autoComplete="name"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="taxId">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>NIP</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          inputMode="numeric"
                          placeholder="Np. 1234567890"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Adres</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_2fr]">
                <form.Field name="street">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field className="sm:col-span-2" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Ulica i numer</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          autoComplete="street-address"
                          placeholder="Np. ul. Kawowa 12"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="postalCode">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Kod pocztowy</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          autoComplete="postal-code"
                          inputMode="numeric"
                          placeholder="00-000"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="city">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Miejscowość</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          autoComplete="address-level2"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Kontakt</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.Field name="phone">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Telefon</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="tel"
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          autoComplete="tel"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>

                <form.Field name="email">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>E-mail</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="email"
                          value={field.state.value ?? ""}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(optionalText(event.target.value))
                          }
                          aria-invalid={isInvalid}
                          autoComplete="email"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                </form.Field>
              </FieldGroup>
            </FieldSet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TypeIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <CardTitle>Krój pisma dokumentów</CardTitle>
                <CardDescription>
                  Wybrany krój zostanie użyty w podglądzie i na wydrukowanej Karcie
                  Naprawy.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form.Field name="documentFont">
              {(field) => {
                const selectedOption = DOCUMENT_FONT_OPTIONS.find(
                  (option) => option.value === field.state.value
                )

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Czcionka dokumentu</FieldLabel>
                    <Select
                      items={DOCUMENT_FONT_SELECT_ITEMS}
                      value={field.state.value}
                      onValueChange={(value) => {
                        if (isDocumentFont(value)) {
                          field.handleChange(value)
                          field.handleBlur()
                        }
                      }}
                    >
                      <SelectTrigger id={field.name} className="h-10 w-full sm:max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start" alignItemWithTrigger={false}>
                        <SelectGroup>
                          {DOCUMENT_FONT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex min-w-0 flex-col">
                                <span style={{ fontFamily: option.fontFamily }}>
                                  {option.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {selectedOption?.description}. Times New Roman najlepiej odpowiada
                      typografii załączonego wzoru PDF.
                    </FieldDescription>

                    <div
                      className="mt-2 rounded-lg border bg-white px-5 py-4 text-black shadow-xs"
                      style={{ fontFamily: getDocumentFontFamily(field.state.value) }}
                      aria-label="Próbka wybranej czcionki"
                    >
                      <p className="text-lg font-bold">Karta naprawy</p>
                      <p className="mt-1 text-sm">
                        Zażółć gęślą jaźń — przegląd i konserwacja urządzenia
                      </p>
                    </div>
                  </Field>
                )
              }}
            </form.Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <CardTitle>Pieczęć firmowa</CardTitle>
                <CardDescription>
                  Obraz pieczęci zostanie automatycznie dodany u dołu Karty Naprawy.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form.Field name="stampDataUrl">
              {(field) => (
                <Field data-invalid={Boolean(uploadError)}>
                  <FieldLabel htmlFor="firm-stamp-file">Obraz pieczęci</FieldLabel>
                  <FieldDescription id="firm-stamp-description">
                    Wybierz plik PNG, JPEG lub WebP o rozmiarze do 2 MiB. Najlepiej
                    sprawdzi się obraz z przezroczystym albo białym tłem.
                  </FieldDescription>

                  <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    {field.state.value ? (
                      <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed bg-white p-4 dark:bg-white">
                        <img
                          src={field.state.value}
                          alt="Podgląd pieczęci firmowej"
                          className="max-h-32 max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-4 text-center text-muted-foreground">
                        <ImageIcon className="size-7" />
                        <span className="text-sm">Nie dodano jeszcze pieczęci.</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 md:w-40 md:flex-col">
                      <input
                        ref={stampInputRef}
                        id="firm-stamp-file"
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        aria-describedby="firm-stamp-description"
                        onChange={async (event) => {
                          const input = event.currentTarget
                          const file = input.files?.[0]
                          if (!file) return

                          setUploadError(null)
                          setSaved(false)

                          if (!ACCEPTED_STAMP_TYPES.has(file.type)) {
                            setUploadError(
                              "Nieobsługiwany format pliku. Wybierz obraz PNG, JPEG lub WebP."
                            )
                            input.value = ""
                            return
                          }

                          if (file.size > MAX_STAMP_FILE_SIZE) {
                            setUploadError("Obraz pieczęci nie może być większy niż 2 MiB.")
                            input.value = ""
                            return
                          }

                          setReadingStamp(true)
                          try {
                            const dataUrl = await readFileAsDataUrl(file)
                            field.handleChange(dataUrl)
                            field.handleBlur()
                          } catch (error) {
                            setUploadError(
                              errorMessage(
                                error,
                                "Nie udało się odczytać wybranego obrazu."
                              )
                            )
                          } finally {
                            setReadingStamp(false)
                            input.value = ""
                          }
                        }}
                      />

                      <Button
                        type="button"
                        variant="outline"
                        disabled={readingStamp}
                        onClick={() => stampInputRef.current?.click()}
                      >
                        {readingStamp ? (
                          <LoaderCircleIcon
                            className="animate-spin"
                            data-icon="inline-start"
                          />
                        ) : (
                          <UploadIcon data-icon="inline-start" />
                        )}
                        {readingStamp
                          ? "Wczytywanie…"
                          : field.state.value
                            ? "Zmień obraz"
                            : "Dodaj obraz"}
                      </Button>

                      {field.state.value && (
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={readingStamp}
                          onClick={() => {
                            field.handleChange(null)
                            field.handleBlur()
                            setUploadError(null)
                            setSaved(false)
                            if (stampInputRef.current) stampInputRef.current.value = ""
                          }}
                        >
                          <Trash2Icon data-icon="inline-start" />
                          Usuń pieczęć
                        </Button>
                      )}
                    </div>
                  </div>

                  {uploadError && <FieldError>{uploadError}</FieldError>}
                </Field>
              )}
            </form.Field>
          </CardContent>

          <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Pola opcjonalne można wyczyścić i zapisać ponownie.
            </p>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
            >
              {([canSubmit, isSubmitting, isDirty]) => (
                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit || isSubmitting || !isDirty || readingStamp}
                >
                  {isSubmitting ? (
                    <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <SaveIcon data-icon="inline-start" />
                  )}
                  {isSubmitting ? "Zapisywanie…" : "Zapisz ustawienia"}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </Card>
      </form>
    </section>
  )
}

export { FirmSettingsView }
