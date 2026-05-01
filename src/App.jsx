import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ExcelUploadPage from './pages/ExcelUploadPage'
import InvoicePage from './pages/InvoicePage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brown-border border-t-terracotta" />
          <p className="mt-3 font-heading text-xs text-brown-light">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return null

  if (session) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        {/* Protected routes inside AppShell */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="excel-upload" element={<ExcelUploadPage />} />
          <Route path="invoice" element={<InvoicePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
