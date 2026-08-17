import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router"

import "./App.css"
import { Navbar } from "@/components/Navbar"
import { HomeView } from "@/views/HomeView"
import { NewServiceOrderView } from "@/views/NewServiceOrderView"
import { RepairsView } from "@/views/RepairsView"
import { RequestDetailsView } from "@/views/RequestDetailsView"

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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
      { path: "naprawy/:id", Component: RequestDetailsView },
      { path: "zlecenia/nowe", Component: NewServiceOrderView },
      { path: "*", Component: NotFoundRedirect },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
