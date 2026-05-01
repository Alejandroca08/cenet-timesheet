import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import CursorGlow from './CursorGlow'
import { Menu, X } from 'lucide-react'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream">
      <CursorGlow />

      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-brown-border bg-white/80 backdrop-blur-sm px-4 py-3 lg:hidden">
        <div>
          <h1 className="font-heading text-lg font-bold text-brown-dark tracking-tight">CENET</h1>
          <p className="font-mono text-[9px] text-brown-light uppercase tracking-widest -mt-0.5">Timesheet</p>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 text-brown-warm hover:bg-brown-hover transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="relative z-[1] min-h-screen p-4 sm:p-6 lg:ml-56 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
