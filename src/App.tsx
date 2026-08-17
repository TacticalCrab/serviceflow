import { Navigate, Outlet, Route, Routes } from "react-router"

import "./App.css"
import { Navbar } from "@/components/Navbar"
import { HomeView } from "@/views/HomeView"
import { NewServiceOrderView } from "@/views/NewServiceOrderView"
import { RepairsView } from "@/views/RepairsView"

function AppLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomeView />} />
        <Route path="naprawy" element={<RepairsView />} />
        <Route path="zlecenia/nowe" element={<NewServiceOrderView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
