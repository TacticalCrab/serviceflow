import { useEffect, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import { CalendarIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react"

import { DefaultValueInput } from "@/components/DefaultValueInput"
import { DeviceProducerInput } from "@/components/DeviceProducerInput"
import { ServiceStepInput } from "@/components/ServiceStepInput"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatPhoneNumber } from "@/lib/phone"
import {
  finalPrice,
  totalAdditionalExpenses,
  totalIncludedInFinalPrice,
} from "@/features/ServiceRequests/pricing"

import { schema, type FormSchema } from "./schema"

const CLIENT_NAME_DEFAULT_KEY = "service-request.client-name"
const DEVICE_NAME_DEFAULT_KEY = "service-request.device-name"

type ServiceFormProps = {
  className?: string
  defaultValues?: FormSchema
  description?: string
  formId?: string
  onDirtyChange?: (isDirty: boolean) => void
  onSubmit?: (values: FormSchema) => Promise<void> | void
  submitLabel?: string
  title?: string
}

function createDefaultValues(values?: FormSchema): FormSchema {
  return {
    requestedCreatedAt: values?.requestedCreatedAt ?? new Date(),
    client: {
      name: values?.client.name ?? "",
      surname: values?.client.surname,
      phone: values?.client.phone,
      email: values?.client.email,
      address: values?.client.address,
      note: values?.client.note,
      preferences: {
        checkIn: {
          method: values?.client.preferences?.checkIn?.method,
          date: values?.client.preferences?.checkIn?.date,
          timeMode: values?.client.preferences?.checkIn?.timeMode,
          time: values?.client.preferences?.checkIn?.time,
          timeFrom: values?.client.preferences?.checkIn?.timeFrom,
          timeTo: values?.client.preferences?.checkIn?.timeTo,
        },
        checkOut: {
          method: values?.client.preferences?.checkOut?.method,
          date: values?.client.preferences?.checkOut?.date,
          timeMode: values?.client.preferences?.checkOut?.timeMode,
          time: values?.client.preferences?.checkOut?.time,
          timeFrom: values?.client.preferences?.checkOut?.timeFrom,
          timeTo: values?.client.preferences?.checkOut?.timeTo,
        },
        repairCard: values?.client.preferences?.repairCard ?? false,
        invoice: values?.client.preferences?.invoice ?? false,
      },
    },
    device: {
      name: values?.device.name ?? "",
      manufacturer: values?.device.manufacturer,
      model: values?.device.model,
      serialNumber: values?.device.serialNumber,
      defect: values?.device.defect,
    },
    repairTime: values?.repairTime,
    repairSteps: [...(values?.repairSteps ?? [])],
    additionalCosts:
      values?.additionalCosts?.map((cost) => ({
        ...cost,
        includeInFinalPrice: cost.includeInFinalPrice ?? false,
      })) ?? [],
    costEstimate: values?.costEstimate,
    note: values?.note,
  }
}

function optionalText(value: string) {
  return value === "" ? undefined : value
}

function numberInputValue(value: number | undefined) {
  return typeof value === "number" && !Number.isNaN(value) ? value : ""
}

type DatePickerProps = {
  id: string
  value?: Date
  onChange: (value: Date | undefined) => void
  onBlur: () => void
  invalid?: boolean
  placeholder: string
}

function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  placeholder,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            aria-invalid={invalid}
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {value ? format(value, "PPP", { locale: pl }) : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            onBlur()
            setOpen(false)
          }}
          manualDateInput={{
            value,
            onValueChange: (date) => {
              onChange(date)
              onBlur()
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

function FormDirtyObserver({
  isDirty,
  onDirtyChange,
}: {
  isDirty: boolean
  onDirtyChange?: (isDirty: boolean) => void
}) {
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  return null
}

function ServiceForm({
  className,
  defaultValues,
  description = "Uzupełnij dane klienta, urządzenia i planowanej naprawy.",
  formId,
  onDirtyChange,
  onSubmit,
  submitLabel = "Zapisz zlecenie",
  title = "Nowe zlecenie serwisowe",
}: ServiceFormProps) {
  const [formDefaults] = useState(() => createDefaultValues(defaultValues))
  const form = useForm({
    defaultValues: formDefaults,
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value, formApi }) => {
      await onSubmit?.(value)
      formApi.reset(value)
    },
    onSubmitInvalid: () => {
      window.requestAnimationFrame(() => {
        const invalidField = document.querySelector<HTMLElement>('[data-invalid="true"]')
        if (!invalidField) return

        invalidField.scrollIntoView({ behavior: "smooth", block: "center" })
        invalidField
          .querySelector<HTMLElement>('input, textarea, button, [role="combobox"]')
          ?.focus({ preventScroll: true })
      })
    },
  })

  useEffect(() => {
    function handleSaveShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return

      event.preventDefault()
      void form.handleSubmit().catch(() => undefined)
    }

    window.addEventListener("keydown", handleSaveShortcut)
    return () => window.removeEventListener("keydown", handleSaveShortcut)
  }, [form])

  return (
    <form
      id={formId}
      className={cn("w-full", className)}
      noValidate
      autoComplete="off"
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault()
        }
      }}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit().catch(() => undefined)
      }}
    >
      <form.Subscribe selector={(state) => state.isDirty}>
        {(isDirty) => (
          <FormDirtyObserver isDirty={isDirty} onDirtyChange={onDirtyChange} />
        )}
      </form.Subscribe>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <FieldSet className="order-5 rounded-lg border p-4">
            <FieldLegend>Dane zlecenia</FieldLegend>
            <form.Field name="requestedCreatedAt">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field className="max-w-sm" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Data i godzina utworzenia</FieldLabel>
                    <div className="grid grid-cols-2 gap-3">
                      <DatePicker
                        id={field.name}
                        value={field.state.value}
                        onChange={(date) => {
                          if (date) field.handleChange(date)
                        }}
                        onBlur={field.handleBlur}
                        invalid={isInvalid}
                        placeholder="Wybierz datę"
                      />
                      <Input
                        id={`${field.name}-time`}
                        type="time"
                        value={format(field.state.value, "HH:mm")}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          const [hours, minutes] = event.target.value.split(":").map(Number)
                          if (Number.isNaN(hours) || Number.isNaN(minutes)) return

                          const nextDate = new Date(field.state.value)
                          nextDate.setHours(hours, minutes, 0, 0)
                          field.handleChange(nextDate)
                        }}
                        aria-label="Godzina utworzenia"
                        aria-invalid={isInvalid}
                      />
                    </div>
                    <FieldDescription>
                      Domyślnie ustawiany jest bieżący moment. Możesz go skorygować.
                    </FieldDescription>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
            <form.Field name="note">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field className="mt-4 max-w-2xl" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Notatka do zlecenia</FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(optionalText(event.target.value))}
                      aria-invalid={isInvalid}
                      placeholder="Dodatkowe informacje dotyczące tego zlecenia"
                      rows={3}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
          </FieldSet>

          <FieldSet className="order-4 rounded-lg border p-4">
            <FieldLegend>Dane klienta</FieldLegend>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field name="client.name">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Klient <span className="text-destructive">*</span>
                      </FieldLabel>
                      <DefaultValueInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onValueChange={field.handleChange}
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        defaultKey={CLIENT_NAME_DEFAULT_KEY}
                        defaultValue="Klient"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="client.surname">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Nazwisko</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                        autoComplete="off"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="client.phone">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Telefon</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="tel"
                        value={formatPhoneNumber(field.state.value)}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(optionalText(formatPhoneNumber(event.target.value)))
                        }
                        aria-invalid={isInvalid}
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="123 456 789"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="client.email">
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
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                        autoComplete="off"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="client.address">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field className="sm:col-span-2" data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Adres</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        rows={2}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>
              <form.Field name="client.note">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field className="sm:col-span-2" data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Notatka o kliencie</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                        placeholder="Informacje pomocne przy obsłudze tego klienta"
                        rows={3}
                      />
                      <FieldDescription>Opis klienta widoczny przy tym zleceniu.</FieldDescription>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>
            </FieldGroup>

            <FieldSet>
              <FieldLegend variant="label">Preferencje klienta</FieldLegend>
              <FieldGroup className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <FieldSet className="rounded-lg border bg-muted/30 p-3">
                  <FieldLegend variant="label">Przyjęcie sprzętu do serwisu</FieldLegend>
                  <form.Field name="client.preferences.checkIn.method">
                    {(methodField) => (
                      <>
                        <Field>
                          <RadioGroup
                              name={methodField.name}
                              value={methodField.state.value ?? "unsettled"}
                              onValueChange={(value) => {
                                if (value === "unsettled") {
                                  methodField.handleChange(undefined)
                                  form.setFieldValue("client.preferences.checkIn.date", undefined)
                                  form.setFieldValue("client.preferences.checkIn.timeMode", undefined)
                                  form.setFieldValue("client.preferences.checkIn.time", undefined)
                                  form.setFieldValue("client.preferences.checkIn.timeFrom", undefined)
                                  form.setFieldValue("client.preferences.checkIn.timeTo", undefined)
                                  return
                                }

                                methodField.handleChange(value as "clientDropOff" | "servicePickup")
                                form.setFieldValue("client.preferences.checkIn.timeMode", "allDay")
                              }}
                              onBlur={methodField.handleBlur}
                            >
                              <Field orientation="horizontal">
                                <RadioGroupItem id="check-in-unsettled" value="unsettled" />
                                <FieldLabel htmlFor="check-in-unsettled">Nie ustalono</FieldLabel>
                              </Field>
                              <Field orientation="horizontal">
                                <RadioGroupItem
                                  id="check-in-client"
                                  value="clientDropOff"
                                />
                                <FieldLabel htmlFor="check-in-client">
                                  Klient przywozi sprzęt
                                </FieldLabel>
                              </Field>
                              <Field orientation="horizontal">
                                <RadioGroupItem
                                  id="check-in-service"
                                  value="servicePickup"
                                />
                                <FieldLabel htmlFor="check-in-service">
                                  Serwis odbiera sprzęt
                                </FieldLabel>
                              </Field>
                          </RadioGroup>
                        </Field>

                        {methodField.state.value && (
                          <form.Field name="client.preferences.checkIn.date">
                            {(dateField) => {
                              const isInvalid =
                                dateField.state.meta.isTouched &&
                                !dateField.state.meta.isValid

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={dateField.name}>
                                    Data przyjęcia
                                  </FieldLabel>
                                  <DatePicker
                                    id={dateField.name}
                                    value={dateField.state.value}
                                    onChange={dateField.handleChange}
                                    onBlur={dateField.handleBlur}
                                    invalid={isInvalid}
                                    placeholder="Wybierz datę przyjęcia"
                                  />
                                  {isInvalid && (
                                    <FieldError errors={dateField.state.meta.errors} />
                                  )}
                                </Field>
                              )
                            }}
                          </form.Field>
                        )}

                        {methodField.state.value && (
                          <form.Field name="client.preferences.checkIn.timeMode">
                            {(timeModeField) => (
                              <Field>
                                <FieldLabel>Godzina przyjęcia</FieldLabel>
                                <RadioGroup
                                  name={timeModeField.name}
                                  value={timeModeField.state.value ?? "allDay"}
                                  onValueChange={(value) => {
                                    const timeMode = value as "allDay" | "specific" | "range"
                                    timeModeField.handleChange(timeMode)
                                    if (timeMode === "specific") {
                                      form.setFieldValue(
                                        "client.preferences.checkIn.timeFrom",
                                        undefined
                                      )
                                      form.setFieldValue(
                                        "client.preferences.checkIn.timeTo",
                                        undefined
                                      )
                                    } else if (timeMode === "range") {
                                      form.setFieldValue(
                                        "client.preferences.checkIn.time",
                                        undefined
                                      )
                                    } else {
                                      form.setFieldValue("client.preferences.checkIn.time", undefined)
                                      form.setFieldValue("client.preferences.checkIn.timeFrom", undefined)
                                      form.setFieldValue("client.preferences.checkIn.timeTo", undefined)
                                    }
                                  }}
                                  onBlur={timeModeField.handleBlur}
                                >
                                  <Field orientation="horizontal">
                                    <RadioGroupItem id="check-in-time-all-day" value="allDay" />
                                    <FieldLabel htmlFor="check-in-time-all-day">Cały dzień</FieldLabel>
                                  </Field>
                                  <Field orientation="horizontal">
                                    <RadioGroupItem id="check-in-time-specific" value="specific" />
                                    <FieldLabel htmlFor="check-in-time-specific">
                                      Konkretna godzina
                                    </FieldLabel>
                                  </Field>
                                  <Field orientation="horizontal">
                                    <RadioGroupItem id="check-in-time-range" value="range" />
                                    <FieldLabel htmlFor="check-in-time-range">
                                      Przedział godzin
                                    </FieldLabel>
                                  </Field>
                                </RadioGroup>

                                {timeModeField.state.value === "specific" && (
                                  <form.Field name="client.preferences.checkIn.time">
                                    {(timeField) => (
                                      <Field>
                                        <FieldLabel htmlFor={timeField.name}>Godzina</FieldLabel>
                                        <Input
                                          id={timeField.name}
                                          name={timeField.name}
                                          type="time"
                                          value={timeField.state.value ?? ""}
                                          onBlur={timeField.handleBlur}
                                          onChange={(event) =>
                                            timeField.handleChange(optionalText(event.target.value))
                                          }
                                        />
                                      </Field>
                                    )}
                                  </form.Field>
                                )}

                                {timeModeField.state.value === "range" && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <form.Field name="client.preferences.checkIn.timeFrom">
                                      {(timeField) => (
                                        <Field>
                                          <FieldLabel htmlFor={timeField.name}>Od</FieldLabel>
                                          <Input
                                            id={timeField.name}
                                            name={timeField.name}
                                            type="time"
                                            value={timeField.state.value ?? ""}
                                            onBlur={timeField.handleBlur}
                                            onChange={(event) =>
                                              timeField.handleChange(optionalText(event.target.value))
                                            }
                                          />
                                        </Field>
                                      )}
                                    </form.Field>
                                    <form.Field name="client.preferences.checkIn.timeTo">
                                      {(timeField) => (
                                        <Field>
                                          <FieldLabel htmlFor={timeField.name}>Do</FieldLabel>
                                          <Input
                                            id={timeField.name}
                                            name={timeField.name}
                                            type="time"
                                            value={timeField.state.value ?? ""}
                                            onBlur={timeField.handleBlur}
                                            onChange={(event) =>
                                              timeField.handleChange(optionalText(event.target.value))
                                            }
                                          />
                                        </Field>
                                      )}
                                    </form.Field>
                                  </div>
                                )}
                              </Field>
                            )}
                          </form.Field>
                        )}
                      </>
                    )}
                  </form.Field>
                </FieldSet>

                <FieldSet className="rounded-lg border bg-muted/30 p-3">
                  <FieldLegend variant="label">Zwrot sprzętu po naprawie</FieldLegend>
                  <form.Field name="client.preferences.checkOut.method">
                    {(methodField) => (
                      <>
                        <Field>
                          <RadioGroup
                              name={methodField.name}
                              value={methodField.state.value ?? "unsettled"}
                              onValueChange={(value) => {
                                if (value === "unsettled") {
                                  methodField.handleChange(undefined)
                                  form.setFieldValue("client.preferences.checkOut.date", undefined)
                                  form.setFieldValue("client.preferences.checkOut.timeMode", undefined)
                                  form.setFieldValue("client.preferences.checkOut.time", undefined)
                                  form.setFieldValue("client.preferences.checkOut.timeFrom", undefined)
                                  form.setFieldValue("client.preferences.checkOut.timeTo", undefined)
                                  return
                                }

                                methodField.handleChange(value as "clientPickup" | "serviceDelivery")
                                form.setFieldValue("client.preferences.checkOut.timeMode", "allDay")
                              }}
                              onBlur={methodField.handleBlur}
                            >
                              <Field orientation="horizontal">
                                <RadioGroupItem id="check-out-unsettled" value="unsettled" />
                                <FieldLabel htmlFor="check-out-unsettled">Nie ustalono</FieldLabel>
                              </Field>
                              <Field orientation="horizontal">
                                <RadioGroupItem
                                  id="check-out-client"
                                  value="clientPickup"
                                />
                                <FieldLabel htmlFor="check-out-client">
                                  Klient odbiera sprzęt
                                </FieldLabel>
                              </Field>
                              <Field orientation="horizontal">
                                <RadioGroupItem
                                  id="check-out-service"
                                  value="serviceDelivery"
                                />
                                <FieldLabel htmlFor="check-out-service">
                                  Serwis dostarcza sprzęt
                                </FieldLabel>
                              </Field>
                          </RadioGroup>
                        </Field>

                        {methodField.state.value && (
                          <form.Field name="client.preferences.checkOut.date">
                            {(dateField) => {
                              const isInvalid =
                                dateField.state.meta.isTouched &&
                                !dateField.state.meta.isValid

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={dateField.name}>
                                    Planowana data zwrotu
                                  </FieldLabel>
                                  <DatePicker
                                    id={dateField.name}
                                    value={dateField.state.value}
                                    onChange={dateField.handleChange}
                                    onBlur={dateField.handleBlur}
                                    invalid={isInvalid}
                                    placeholder="Wybierz datę zwrotu"
                                  />
                                  {isInvalid && (
                                    <FieldError errors={dateField.state.meta.errors} />
                                  )}
                                </Field>
                              )
                            }}
                          </form.Field>
                        )}

                        {methodField.state.value && (
                          <form.Field name="client.preferences.checkOut.timeMode">
                            {(timeModeField) => (
                              <Field>
                                <FieldLabel>Godzina zwrotu</FieldLabel>
                                <RadioGroup
                                  name={timeModeField.name}
                                  value={timeModeField.state.value ?? "allDay"}
                                  onValueChange={(value) => {
                                    const timeMode = value as "allDay" | "specific" | "range"
                                    timeModeField.handleChange(timeMode)
                                    if (timeMode === "specific") {
                                      form.setFieldValue(
                                        "client.preferences.checkOut.timeFrom",
                                        undefined
                                      )
                                      form.setFieldValue(
                                        "client.preferences.checkOut.timeTo",
                                        undefined
                                      )
                                    } else if (timeMode === "range") {
                                      form.setFieldValue(
                                        "client.preferences.checkOut.time",
                                        undefined
                                      )
                                    } else {
                                      form.setFieldValue("client.preferences.checkOut.time", undefined)
                                      form.setFieldValue("client.preferences.checkOut.timeFrom", undefined)
                                      form.setFieldValue("client.preferences.checkOut.timeTo", undefined)
                                    }
                                  }}
                                  onBlur={timeModeField.handleBlur}
                                >
                                  <Field orientation="horizontal">
                                    <RadioGroupItem id="check-out-time-all-day" value="allDay" />
                                    <FieldLabel htmlFor="check-out-time-all-day">Cały dzień</FieldLabel>
                                  </Field>
                                  <Field orientation="horizontal">
                                    <RadioGroupItem id="check-out-time-specific" value="specific" />
                                    <FieldLabel htmlFor="check-out-time-specific">
                                      Konkretna godzina
                                    </FieldLabel>
                                  </Field>
                                  <Field orientation="horizontal">
                                    <RadioGroupItem id="check-out-time-range" value="range" />
                                    <FieldLabel htmlFor="check-out-time-range">
                                      Przedział godzin
                                    </FieldLabel>
                                  </Field>
                                </RadioGroup>

                                {timeModeField.state.value === "specific" && (
                                  <form.Field name="client.preferences.checkOut.time">
                                    {(timeField) => (
                                      <Field>
                                        <FieldLabel htmlFor={timeField.name}>Godzina</FieldLabel>
                                        <Input
                                          id={timeField.name}
                                          name={timeField.name}
                                          type="time"
                                          value={timeField.state.value ?? ""}
                                          onBlur={timeField.handleBlur}
                                          onChange={(event) =>
                                            timeField.handleChange(optionalText(event.target.value))
                                          }
                                        />
                                      </Field>
                                    )}
                                  </form.Field>
                                )}

                                {timeModeField.state.value === "range" && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <form.Field name="client.preferences.checkOut.timeFrom">
                                      {(timeField) => (
                                        <Field>
                                          <FieldLabel htmlFor={timeField.name}>Od</FieldLabel>
                                          <Input
                                            id={timeField.name}
                                            name={timeField.name}
                                            type="time"
                                            value={timeField.state.value ?? ""}
                                            onBlur={timeField.handleBlur}
                                            onChange={(event) =>
                                              timeField.handleChange(optionalText(event.target.value))
                                            }
                                          />
                                        </Field>
                                      )}
                                    </form.Field>
                                    <form.Field name="client.preferences.checkOut.timeTo">
                                      {(timeField) => (
                                        <Field>
                                          <FieldLabel htmlFor={timeField.name}>Do</FieldLabel>
                                          <Input
                                            id={timeField.name}
                                            name={timeField.name}
                                            type="time"
                                            value={timeField.state.value ?? ""}
                                            onBlur={timeField.handleBlur}
                                            onChange={(event) =>
                                              timeField.handleChange(optionalText(event.target.value))
                                            }
                                          />
                                        </Field>
                                      )}
                                    </form.Field>
                                  </div>
                                )}
                              </Field>
                            )}
                          </form.Field>
                        )}
                      </>
                    )}
                  </form.Field>
                </FieldSet>
              </FieldGroup>

              <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <form.Field name="client.preferences.repairCard">
                  {(field) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                      <FieldLabel htmlFor={field.name}>Karta naprawy</FieldLabel>
                    </Field>
                  )}
                </form.Field>

                <form.Field name="client.preferences.invoice">
                  {(field) => (
                    <Field orientation="horizontal">
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        checked={field.state.value ?? false}
                        onCheckedChange={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                      <FieldLabel htmlFor={field.name}>Faktura</FieldLabel>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            </FieldSet>
          </FieldSet>

          <FieldSet className="order-1 rounded-lg border p-4">
            <FieldLegend>Urządzenie</FieldLegend>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field name="device.name">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Nazwa urządzenia <span className="text-destructive">*</span>
                      </FieldLabel>
                      <DefaultValueInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onValueChange={field.handleChange}
                        aria-invalid={isInvalid}
                        defaultKey={DEVICE_NAME_DEFAULT_KEY}
                        defaultValue="Ekspres do kawy"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="device.manufacturer">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Producent</FieldLabel>
                      <DeviceProducerInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onValueChange={(value) => field.handleChange(optionalText(value))}
                        aria-invalid={isInvalid}
                        placeholder="Np. Hendi"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="device.model">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Model</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="device.serialNumber">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Numer seryjny</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(optionalText(event.target.value))
                        }
                        aria-invalid={isInvalid}
                        placeholder="Np. SN-12345678"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="device.defect">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field className="sm:col-span-2" data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Opis usterki</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                        placeholder="Opisz objawy i okoliczności wystąpienia usterki"
                        rows={4}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet className="order-2 rounded-lg border p-4">
            <FieldLegend>Plan naprawy</FieldLegend>
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <form.Field name="repairTime">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Przewidywany czas naprawy</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(optionalText(event.target.value))}
                        aria-invalid={isInvalid}
                        placeholder="Np. 3 dni robocze"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              </form.Field>

            </FieldGroup>

            <form.Field name="repairSteps" mode="array">
              {(field) => (
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <FieldLabel>Kroki naprawy</FieldLabel>
                      <FieldDescription>Dodaj kolejne etapy planowanych prac.</FieldDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => field.pushValue("")}>
                      <PlusIcon data-icon="inline-start" />
                      Dodaj krok
                    </Button>
                  </div>

                  {(field.state.value ?? []).length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Nie dodano jeszcze żadnych kroków.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {(field.state.value ?? []).map((_, index) => (
                        <form.Field key={index} name={`repairSteps[${index}]`}>
                          {(stepField) => {
                            const isInvalid =
                              stepField.state.meta.isTouched && !stepField.state.meta.isValid

                            return (
                              <Field data-invalid={isInvalid}>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <FieldLabel className="sr-only" htmlFor={stepField.name}>
                                      Krok {index + 1}
                                    </FieldLabel>
                                    <ServiceStepInput
                                      id={stepField.name}
                                      name={stepField.name}
                                      value={stepField.state.value ?? ""}
                                      onBlur={stepField.handleBlur}
                                      onValueChange={stepField.handleChange}
                                      onKeyDown={(event) => {
                                        if (event.key !== "Enter") return

                                        event.preventDefault()
                                        const nextIndex = index + 1
                                        field.insertValue(nextIndex, "")
                                        window.requestAnimationFrame(() => {
                                          document.getElementById(`repairSteps[${nextIndex}]`)?.focus()
                                        })
                                      }}
                                      aria-invalid={isInvalid}
                                      placeholder={`Krok ${index + 1}`}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => field.removeValue(index)}
                                    aria-label={`Usuń krok ${index + 1}`}
                                  >
                                    <Trash2Icon />
                                  </Button>
                                </div>
                                {isInvalid && <FieldError errors={stepField.state.meta.errors} />}
                              </Field>
                            )
                          }}
                        </form.Field>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => field.pushValue("")}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Dodaj kolejny krok
                  </Button>
                </Field>
              )}
            </form.Field>
          </FieldSet>

          <FieldSet className="order-3 rounded-lg border p-4">
            <FieldLegend>Rozliczenie</FieldLegend>
            <FieldDescription>
              Robocizna jest podstawą kwoty dla klienta. Każdy wydatek pozostaje kosztem wewnętrznym, niezależnie od tego, czy zostanie doliczony do kwoty końcowej.
            </FieldDescription>
            <form.Field name="costEstimate">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid} className="max-w-sm">
                    <FieldLabel htmlFor={field.name}>Robocizna</FieldLabel>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        min="0"
                        step="0.01"
                        value={numberInputValue(field.state.value)}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          const value = event.target.value
                          field.handleChange(value === "" ? undefined : Number(value))
                        }}
                        aria-invalid={isInvalid}
                        className="pr-11"
                        inputMode="decimal"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
                        PLN
                      </span>
                    </div>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
            <form.Field name="additionalCosts" mode="array">
              {(field) => (
                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldDescription>
                      Dodaj części, materiały i inne wydatki związane z naprawą.
                    </FieldDescription>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => field.pushValue({ description: "", price: 0, includeInFinalPrice: true })}
                    >
                      <PlusIcon data-icon="inline-start" />
                      Dodaj koszt
                    </Button>
                  </div>

                  {(field.state.value ?? []).length === 0 ? (
                    <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Brak dodatkowych kosztów.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {(field.state.value ?? []).map((_, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-end gap-2.5 rounded-lg bg-muted/50 p-2.5"
                        >
                          <form.Field name={`additionalCosts[${index}].description`}>
                            {(descriptionField) => {
                              const isInvalid =
                                descriptionField.state.meta.isTouched &&
                                !descriptionField.state.meta.isValid
                              const inputWidth = Math.min(
                                Math.max((descriptionField.state.value?.length ?? 0) * 10 + 48, 220),
                                520
                              )

                              return (
                                <Field
                                  data-invalid={isInvalid}
                                  className="w-full shrink-0 sm:w-auto"
                                  style={{ width: inputWidth }}
                                >
                                  <FieldLabel className="sr-only" htmlFor={descriptionField.name}>Opis</FieldLabel>
                                  <Input
                                    id={descriptionField.name}
                                    name={descriptionField.name}
                                    value={descriptionField.state.value}
                                    onBlur={descriptionField.handleBlur}
                                    onChange={(event) =>
                                      descriptionField.handleChange(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key !== "Enter") return

                                      event.preventDefault()
                                      const nextIndex = index + 1
                                      field.insertValue(nextIndex, { description: "", price: 0, includeInFinalPrice: true })
                                      window.requestAnimationFrame(() => {
                                        document
                                          .getElementById(`additionalCosts[${nextIndex}].description`)
                                          ?.focus()
                                      })
                                    }}
                                    aria-invalid={isInvalid}
                                    placeholder="Opis wydatku, np. wymiana uszczelki"
                                  />
                                  {isInvalid && (
                                    <FieldError errors={descriptionField.state.meta.errors} />
                                  )}
                                </Field>
                              )
                            }}
                          </form.Field>

                          <form.Field name={`additionalCosts[${index}].price`}>
                            {(priceField) => {
                              const isInvalid =
                                priceField.state.meta.isTouched && !priceField.state.meta.isValid

                              return (
                                <Field data-invalid={isInvalid} className="w-36 shrink-0">
                                  <FieldLabel className="sr-only" htmlFor={priceField.name}>Cena</FieldLabel>
                                  <div className="relative">
                                    <Input
                                      id={priceField.name}
                                      name={priceField.name}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={numberInputValue(priceField.state.value)}
                                      onBlur={priceField.handleBlur}
                                      onChange={(event) => {
                                        const value = event.target.value
                                        priceField.handleChange(
                                          value === "" ? Number.NaN : Number(value)
                                        )
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key !== "Enter") return

                                        event.preventDefault()
                                        const nextIndex = index + 1
                                        field.insertValue(nextIndex, { description: "", price: 0, includeInFinalPrice: true })
                                        window.requestAnimationFrame(() => {
                                          document
                                            .getElementById(`additionalCosts[${nextIndex}].description`)
                                            ?.focus()
                                        })
                                      }}
                                      aria-invalid={isInvalid}
                                      className="pr-11"
                                      inputMode="decimal"
                                    />
                                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
                                      PLN
                                    </span>
                                  </div>
                                  {isInvalid && <FieldError errors={priceField.state.meta.errors} />}
                                </Field>
                              )
                            }}
                          </form.Field>

                          <div className="order-2 basis-full self-center whitespace-nowrap">
                            <form.Field name={`additionalCosts[${index}].includeInFinalPrice`}>
                              {(includedField) => (
                                <Field orientation="horizontal">
                                  <Checkbox
                                    id={includedField.name}
                                    checked={includedField.state.value ?? false}
                                    onCheckedChange={includedField.handleChange}
                                    onBlur={includedField.handleBlur}
                                  />
                                  <FieldLabel htmlFor={includedField.name}>
                                    Wlicz do kwoty końcowej
                                  </FieldLabel>
                                </Field>
                              )}
                            </form.Field>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="order-1 self-center"
                            onClick={() => field.removeValue(index)}
                            aria-label={`Usuń dodatkowy koszt ${index + 1}`}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      field.pushValue({ description: "", price: 0, includeInFinalPrice: true })
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    Dodaj kolejny koszt
                  </Button>
                </Field>
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.values}>
              {(values) => {
                const expenses = totalAdditionalExpenses(values.additionalCosts)
                const includedCosts = totalIncludedInFinalPrice(values.additionalCosts)
                const total = finalPrice(values.costEstimate, values.additionalCosts)

                return (
                  <div className="grid gap-2 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-2">
                    <div>
                      Wydatki: <span className="font-medium tabular-nums">{expenses.toFixed(2)} PLN</span>
                    </div>
                    <div>
                      Wliczone wydatki: <span className="font-medium tabular-nums">{includedCosts.toFixed(2)} PLN</span>
                    </div>
                    <div className="text-base font-semibold sm:col-span-2">
                      Kwota końcowa: {total === undefined ? "—" : `${total.toFixed(2)} PLN`}
                    </div>
                  </div>
                )
              }}
            </form.Subscribe>
          </FieldSet>
        </CardContent>

        <CardFooter className="justify-end">
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting} size="lg">
                <SaveIcon data-icon="inline-start" />
                {isSubmitting ? "Zapisywanie…" : submitLabel}
              </Button>
            )}
          </form.Subscribe>
        </CardFooter>
      </Card>
    </form>
  )
}

export { ServiceForm }
export type { ServiceFormProps }
export default ServiceForm
