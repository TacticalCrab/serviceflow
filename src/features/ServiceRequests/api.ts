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
type ServiceStatus =
  | "waiting_for_device"
  | "diagnosis"
  | "waiting_for_approval"
  | "in_repair"
  | "waiting_for_parts"
  | "ready_for_return"
  | "closed"
  | "cancelled"

type ServiceRequest = ServiceRequestPayload & {
  id: number
  status: ServiceStatus
  createdAt: string
  statusChangedAt: string
}

function serializeFormValues(values: FormSchema): ServiceRequestPayload {
  return JSON.parse(JSON.stringify(values)) as ServiceRequestPayload
}

function parseDate(value: string | null | undefined) {
  if (!value) return undefined

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function serviceRequestToFormValues(request: ServiceRequest): FormSchema {
  const preferences = request.client.preferences

  return {
    client: {
      name: request.client.name,
      surname: request.client.surname ?? undefined,
      phone: request.client.phone ?? undefined,
      email: request.client.email ?? undefined,
      address: request.client.address ?? undefined,
      preferences: preferences
        ? {
            repairCard: preferences.repairCard ?? undefined,
            invoice: preferences.invoice ?? undefined,
            checkIn: preferences.checkIn
              ? {
                  method: preferences.checkIn.method ?? undefined,
                  date: parseDate(preferences.checkIn.date),
                }
              : undefined,
            checkOut: preferences.checkOut
              ? {
                  method: preferences.checkOut.method ?? undefined,
                  date: parseDate(preferences.checkOut.date),
                }
              : undefined,
          }
        : undefined,
    },
    device: {
      name: request.device.name,
      model: request.device.model ?? undefined,
      defect: request.device.defect ?? undefined,
    },
    repairTime: request.repairTime ?? undefined,
    repairSteps: request.repairSteps ? [...request.repairSteps] : undefined,
    additionalCosts: request.additionalCosts?.map((cost) => ({ ...cost })),
    costEstimate: request.costEstimate ?? undefined,
  }
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

async function closeServiceRequest(id: number) {
  return invoke<ServiceRequest>("close_service_request", { id })
}

async function reopenServiceRequest(id: number) {
  return invoke<ServiceRequest>("reopen_service_request", { id })
}

async function updateServiceRequestStatus(id: number, status: ServiceStatus) {
  return invoke<ServiceRequest>("update_service_request_status", { id, status })
}

async function deleteServiceRequest(id: number) {
  return invoke<void>("delete_service_request", { id })
}

async function updateServiceRequest(id: number, values: FormSchema) {
  return invoke<ServiceRequest>("update_service_request", {
    id,
    request: serializeFormValues(values),
  })
}

export {
  closeServiceRequest,
  createServiceRequest,
  deleteServiceRequest,
  getServiceRequest,
  listServiceRequests,
  reopenServiceRequest,
  serviceRequestToFormValues,
  updateServiceRequest,
  updateServiceRequestStatus,
}
export type { ServiceRequest, ServiceRequestPayload, ServiceStatus }
