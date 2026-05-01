import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import CursorGlow from '../components/layout/CursorGlow'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : 'Error al iniciar sesión. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-cream">
      <CursorGlow />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-card border border-brown-border bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-heading text-2xl font-bold text-brown-dark tracking-tight">
              CENET
            </h1>
            <p className="font-mono text-[10px] text-brown-light uppercase tracking-[0.25em] mt-1">
              Timesheet
            </p>
            <div className="mx-auto mt-4 h-0.5 w-10 rounded-full bg-terracotta" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block font-heading text-xs font-medium uppercase tracking-wider text-brown-light"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-brown-border bg-cream/50 px-4 py-2.5 font-body text-sm text-brown-dark outline-none transition-colors placeholder:text-brown-light/50 focus:border-terracotta focus:ring-1 focus:ring-terracotta/20"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block font-heading text-xs font-medium uppercase tracking-wider text-brown-light"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-brown-border bg-cream/50 px-4 py-2.5 font-body text-sm text-brown-dark outline-none transition-colors placeholder:text-brown-light/50 focus:border-terracotta focus:ring-1 focus:ring-terracotta/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-red-50 px-3 py-2 font-heading text-xs font-medium text-red-600"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brown-dark px-4 py-3 font-heading text-sm font-semibold text-cream tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brown-dark/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center font-heading text-[11px] text-brown-light">
          COMERCIO ELECTRÓNICO EN INTERNET CENET SA
        </p>
      </motion.div>
    </div>
  )
}
