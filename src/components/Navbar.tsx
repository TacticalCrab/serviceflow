import { Link, NavLink } from "react-router"
import { PlusIcon, WrenchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Strona Główna", to: "/", end: true },
  { label: "Naprawy", to: "/naprawy", end: false },
]

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mr-2 hidden items-center gap-2 font-semibold tracking-tight text-foreground md:flex"
          aria-label="Cafe Service — strona główna"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <WrenchIcon className="size-4" />
          </span>
          <span>Cafe Serwis</span>
        </Link>

        <nav aria-label="Główna nawigacja" className="flex items-center gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Button
          className="ml-auto"
          nativeButton={false}
          render={<Link to="/zlecenia/nowe" />}
          aria-label="Nowe Zlecenie Serwisowe"
        >
          <PlusIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Nowe Zlecenie Serwisowe</span>
        </Button>
      </div>
    </header>
  )
}

export { Navbar }
