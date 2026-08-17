import { WrenchIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function RepairsView() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Naprawy</h1>
        <p className="text-muted-foreground">Lista zarejestrowanych napraw serwisowych.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Aktywne naprawy</CardTitle>
          <CardDescription>Tutaj pojawią się dodane zlecenia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted">
              <WrenchIcon className="size-5 text-muted-foreground" />
            </span>
            <div>
              <p className="font-medium">Brak napraw</p>
              <p className="text-sm text-muted-foreground">
                Nowe zlecenia będą widoczne w tym miejscu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export { RepairsView }
