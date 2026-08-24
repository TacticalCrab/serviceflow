import { invoke } from "@tauri-apps/api/core"

type InputDefault = {
  key: string
  value: string
}

function getInputDefault(key: string) {
  return invoke<string | null>("get_input_default", { key })
}

function saveInputDefault(key: string, value: string) {
  return invoke<InputDefault>("save_input_default", { key, value })
}

export { getInputDefault, saveInputDefault }
export type { InputDefault }
