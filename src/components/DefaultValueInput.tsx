import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getInputDefault, saveInputDefault } from "@/features/InputDefaults/api"
import { cn } from "@/lib/utils"

function DefaultValueInput({
  defaultKey,
  defaultValue,
  value,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  defaultKey: string
  defaultValue: string
  value: string
  onValueChange: (value: string) => void
}) {
  const [storedDefault, setStoredDefault] = useState(defaultValue)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 })
  const [draft, setDraft] = useState(defaultValue)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void getInputDefault(defaultKey)
      .then((savedValue) => {
        if (!cancelled && savedValue !== null) setStoredDefault(savedValue)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [defaultKey])

  useEffect(() => {
    if (!editorOpen) return

    const closeEditor = () => setEditorOpen(false)
    window.addEventListener("pointerdown", closeEditor)
    return () => window.removeEventListener("pointerdown", closeEditor)
  }, [editorOpen])

  async function saveDefault() {
    setSaving(true)
    setSaveError(null)

    try {
      const savedDefault = await saveInputDefault(defaultKey, draft)
      setStoredDefault(savedDefault.value)
      setEditorOpen(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Nie udało się zapisać wartości.")
    } finally {
      setSaving(false)
    }
  }

  function openDefaultEditor(event: React.MouseEvent) {
    if (!event.ctrlKey && !event.metaKey) return

    event.preventDefault()
    const input =
      event.target instanceof HTMLInputElement
        ? event.target
        : event.currentTarget.querySelector("input")
    const bounds = input?.getBoundingClientRect()
    setDraft(storedDefault)
    setSaveError(null)
    setEditorPosition({
      x: bounds?.left ?? event.clientX,
      y: bounds ? bounds.bottom + 8 : event.clientY,
    })
    setEditorOpen(true)
  }

  return (
    <div
      className="relative grid gap-1.5"
      onPointerDownCapture={(event) => {
        if (event.button === 2 && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
        }
      }}
      onContextMenuCapture={openDefaultEditor}
    >
      <Input
        {...props}
        value={value}
        placeholder={storedDefault}
        className={cn(
          "placeholder:font-medium placeholder:italic placeholder:text-foreground/70",
          className
        )}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !value) {
            event.preventDefault()
            onValueChange(storedDefault)
          }
        }}
      />
      {!value && (
        <FieldDescription>
          Domyślna wartość — naciśnij Enter, aby jej użyć.
        </FieldDescription>
      )}
      {editorOpen && (
        <Card
          className="fixed z-100 w-80 shadow-lg"
          style={{ left: editorPosition.x, top: editorPosition.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <CardHeader className="gap-1 p-4 pb-0">
            <CardTitle className="text-base">Domyślna wartość</CardTitle>
            <CardDescription className="font-mono text-xs">{defaultKey}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Domyślna wartość"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditorOpen(false)
                if (event.key === "Enter") void saveDefault()
              }}
            />
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Anuluj
              </Button>
              <Button type="button" onClick={() => void saveDefault()} disabled={saving}>
                {saving ? "Zapisywanie…" : "Zapisz"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { DefaultValueInput }
