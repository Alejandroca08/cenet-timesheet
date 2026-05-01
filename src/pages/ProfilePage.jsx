import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import ProfileForm from '../components/profile/ProfileForm'
import OAuthConnect from '../components/profile/OAuthConnect'
import TelegramLink from '../components/profile/TelegramLink'

export default function ProfilePage() {
  const { partner, refetchPartner } = useAuth()

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="font-heading text-2xl font-semibold text-brown-dark">
          Perfil
        </h1>
        <p className="mt-1 font-heading text-sm text-brown-light">
          Administra tu información personal, datos bancarios y conexiones.
        </p>
        <div className="mt-3 h-[2.5px] w-[52px] rounded-sm bg-terracotta" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
        {/* Left: Profile form */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-card border border-brown-border bg-white p-6"
        >
          <ProfileForm partner={partner} onSaved={refetchPartner} />
        </motion.div>

        {/* Right: Connections */}
        <div className="flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <OAuthConnect />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <TelegramLink partner={partner} onLinked={refetchPartner} />
          </motion.div>

          {/* Account info */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3">
              Cuenta
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-heading text-xs text-brown-warm">Email</span>
                <span className="font-mono text-xs text-brown-dark">
                  {partner?.email ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-heading text-xs text-brown-warm">Rol</span>
                <span className="font-heading text-xs text-brown-dark">
                  {partner?.is_admin ? 'Administrador' : 'Socio'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-heading text-xs text-brown-warm">Estado</span>
                <span className={`font-heading text-xs ${partner?.is_active ? 'text-sage' : 'text-red-500'}`}>
                  {partner?.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
