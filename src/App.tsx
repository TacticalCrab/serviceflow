import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router"

import "./App.css"
import { Navbar } from "@/components/Navbar"
import { useAppFontSize } from "@/features/DisplaySettings/fontSize"
import { HomeView } from "@/views/HomeView"
import { FirmSettingsView } from "@/views/FirmSettingsView"
import { ConfigurationView } from "@/views/ConfigurationView"
import { NewServiceOrderView } from "@/views/NewServiceOrderView"
import { RepairCardView } from "@/views/RepairCardView"
import { RepairsView } from "@/views/RepairsView"
import { RequestDetailsView } from "@/views/RequestDetailsView"

function AppLayout() {
  useAppFontSize()
  const location = useLocation()
  const isRepairsList = location.pathname === "/naprawy"
  const isRepairCard =
    location.pathname === "/karta-naprawy" ||
    /^\/naprawy\/\d+\/karta-naprawy$/.test(location.pathname)

  return (
    <div
      className={`min-h-screen bg-background print:bg-white ${isRepairCard ? "print:contents" : ""}`}
      data-repair-card-layout={isRepairCard || undefined}
    >
      <Navbar />
      <main
        className={`mx-auto w-full ${isRepairsList ? "max-w-[1800px]" : "max-w-7xl"} px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:p-0 ${isRepairCard ? "print:contents" : ""}`}
      >
        <Outlet />
      </main>
    </div>
  )
}

function NotFoundRedirect() {
  return <Navigate to="/" replace />
}

const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { index: true, Component: HomeView },
      { path: "naprawy", Component: RepairsView },
      { path: "naprawy/:id/karta-naprawy", Component: RepairCardView },
      { path: "naprawy/:id", Component: RequestDetailsView },
      { path: "karta-naprawy", Component: RepairCardView },
      { path: "ustawienia/firma", Component: FirmSettingsView },
      { path: "ustawienia/konfiguracja", Component: ConfigurationView },
      { path: "ustawienia/dokumentow", element: <Navigate to="/ustawienia/firma" replace /> },
      { path: "zlecenia/nowe", Component: NewServiceOrderView },
      { path: "*", Component: NotFoundRedirect },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
