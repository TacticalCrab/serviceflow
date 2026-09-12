import { useState } from "react"
import { useNavigate } from "react-router"
import { CircleAlertIcon, SaveIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import ServiceForm from "@/features/ServiceForm/ServiceForm"
import type { FormSchema } from "@/features/ServiceForm/schema"
import { createServiceRequest } from "@/features/ServiceRequests/api"

const NEW_SERVICE_REQUEST_FORM_ID = "new-service-request-form"

function NewServiceOrderView() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(values: FormSchema) {
    setError(null)
    setSaving(true)

    try {
      await createServiceRequest(values)
      navigate("/naprawy", { replace: true, state: { created: true } })
    } catch (submitError) {
      setError(
        typeof submitError === "string"
          ? submitError
          : "Nie udało się zapisać zlecenia. Spróbuj ponownie."
      )
      throw submitError
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {dirty && (
        <div className="sticky top-20 z-30 flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-card p-3 text-card-foreground shadow-md">
          <SaveIcon className="size-5 shrink-0 text-primary" />
          <div className="mr-auto">
            <p className="text-sm font-medium">Zlecenie jest gotowe do utworzenia</p>
            <p className="text-xs text-muted-foreground">Zapisz je teraz, aby nie stracić wprowadzonych danych.</p>
          </div>
          <Button type="submit" form={NEW_SERVICE_REQUEST_FORM_ID} size="sm" disabled={saving}>
            <SaveIcon data-icon="inline-start" />
            {saving ? "Zapisywanie…" : "Utwórz zlecenie"}
          </Button>
        </div>
      )}
      <ServiceForm
        formId={NEW_SERVICE_REQUEST_FORM_ID}
        onDirtyChange={setDirty}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export { NewServiceOrderView }
