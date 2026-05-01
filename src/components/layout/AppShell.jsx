import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CursorGlow from './CursorGlow'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-cream">
      <CursorGlow />
      <Sidebar />
      <main className="relative z-[1] ml-56 min-h-screen p-8">
        <Outlet />
      </main>
    </div>
  )
}
