import { invoke } from "@tauri-apps/api/core"

import type { FormSchema } from "@/features/ServiceForm/schema"

type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer Item>
    ? Array<Serialized<Item>>
    : T extends object
      ? { [Key in keyof T]: Serialized<T[Key]> }
      : T

type ServiceRequestPayload = Serialized<FormSchema>

type ServiceRequest = ServiceRequestPayload & {
  id: number
  status: string
  createdAt: string
}

function serializeFormValues(values: FormSchema): ServiceRequestPayload {
  return JSON.parse(JSON.stringify(values)) as ServiceRequestPayload
}

async function createServiceRequest(values: FormSchema) {
  return invoke<ServiceRequest>("create_service_request", {
    request: serializeFormValues(values),
  })
}

async function listServiceRequests() {
  return invoke<ServiceRequest[]>("list_service_requests")
}

async function getServiceRequest(id: number) {
  return invoke<ServiceRequest | null>("get_service_request", { id })
}

export { createServiceRequest, getServiceRequest, listServiceRequests }
export type { ServiceRequest, ServiceRequestPayload }
