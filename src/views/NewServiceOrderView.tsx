import { useState } from "react"
import { useNavigate } from "react-router"
import { CircleAlertIcon } from "lucide-react"

import ServiceForm from "@/features/ServiceForm/ServiceForm"
import type { FormSchema } from "@/features/ServiceForm/schema"
import { createServiceRequest } from "@/features/ServiceRequests/api"

function NewServiceOrderView() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(values: FormSchema) {
    setError(null)

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
      <ServiceForm onSubmit={handleSubmit} />
    </div>
  )
}

export { NewServiceOrderView }
