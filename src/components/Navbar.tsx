import { Link, NavLink } from "react-router"
import { ChevronDownIcon, PlusIcon, SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Strona Główna", compactLabel: "Start", to: "/", end: true },
  { label: "Naprawy", compactLabel: "Naprawy", to: "/naprawy", end: false },
  { label: "Karta naprawy", compactLabel: "Karta", to: "/karta-naprawy", end: true },
]

function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 shadow-xs backdrop-blur supports-backdrop-filter:bg-card/90 print:hidden">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mr-2 hidden items-center gap-2 font-semibold tracking-tight text-foreground md:flex"
          aria-label="ServiceFlow — strona główna"
        >
          <img
            src="/serviceflow-favicon.png"
            alt=""
            className="size-8 rounded-lg"
            aria-hidden="true"
          />
          <span>ServiceFlow</span>
        </Link>

        <nav aria-label="Główna nawigacja" className="flex items-center gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary/10 text-primary"
                )
              }
            >
              <span className="sm:hidden">{item.compactLabel}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="ml-auto inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Ustawienia"
          >
            <SettingsIcon className="size-4" />
            <span className="hidden sm:inline">Ustawienia</span>
            <ChevronDownIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem render={<Link to="/ustawienia/firma" />}>
              Ustawienia firmy
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link to="/ustawienia/konfiguracja" />}>
              Konfiguracja
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          nativeButton={false}
          render={<Link to="/zlecenia/nowe" />}
          aria-label="Nowe Zlecenie Serwisowe"
        >
          <PlusIcon data-icon="inline-start" />
          <span className="hidden lg:inline">Nowe Zlecenie Serwisowe</span>
        </Button>
      </div>
    </header>
  )
}

export { Navbar }
