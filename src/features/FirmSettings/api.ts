import { invoke } from "@tauri-apps/api/core"

import type { FirmSettings } from "@/features/FirmSettings/schema"

async function getFirmSettings() {
  return invoke<FirmSettings>("get_firm_settings")
}

async function saveFirmSettings(settings: FirmSettings) {
  return invoke<FirmSettings>("save_firm_settings", { settings })
}

export { getFirmSettings, saveFirmSettings }
export type { FirmSettings }
