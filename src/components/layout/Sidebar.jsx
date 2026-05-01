import { NavLink } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  User,
  Users,
  LogOut,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/excel-upload', label: 'Importar Excel', icon: FileSpreadsheet },
  { to: '/invoice', label: 'Cuenta de cobro', icon: FileText },
  { to: '/profile', label: 'Perfil', icon: User },
]

const adminItems = [
  { to: '/admin', label: 'Administración', icon: Users },
]

export default function Sidebar({ mobileOpen, onClose }) {
  const { partner, signOut, isAdmin } = useAuth()

  const items = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-brown-border bg-white/80 backdrop-blur-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Logo area */}
      <div className="border-b border-brown-border px-5 py-5">
        <h1 className="font-heading text-lg font-bold text-brown-dark tracking-tight">
          CENET
        </h1>
        <p className="font-mono text-[10px] text-brown-light uppercase tracking-widest mt-0.5">
          Timesheet
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 font-heading text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brown-dark text-cream'
                  : 'text-brown-warm hover:bg-brown-hover hover:text-brown-dark'
              }`
            }
          >
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-brown-border p-4">
        <div className="mb-3">
          <p className="font-heading text-sm font-semibold text-brown-dark truncate">
            {partner?.full_name ?? 'Cargando...'}
          </p>
          <p className="font-mono text-[10px] text-brown-light truncate">
            {partner?.email}
          </p>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 font-heading text-xs font-medium text-brown-light transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={14} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
