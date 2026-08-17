import { Link } from "react-router"
import { ArrowRightIcon, ClipboardListIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function HomeView() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Panel serwisowy</p>
        <h1 className="text-3xl font-semibold tracking-tight">Strona Główna</h1>
        <p className="max-w-2xl text-muted-foreground">
          Zarządzaj naprawami i rejestruj nowe zlecenia serwisowe.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardListIcon className="size-5" />
            </div>
            <CardTitle>Naprawy</CardTitle>
            <CardDescription>
              Przejdź do listy zarejestrowanych napraw i zleceń.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" nativeButton={false} render={<Link to="/naprawy" />}>
              Zobacz naprawy
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlusIcon className="size-5" />
            </div>
            <CardTitle>Nowe zlecenie</CardTitle>
            <CardDescription>
              Dodaj klienta, urządzenie oraz szczegóły planowanej naprawy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link to="/zlecenia/nowe" />}>
              Utwórz zlecenie
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export { HomeView }
