import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mail, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

const PROVIDERS = [
  {
    id: 'google',
    name: 'Gmail',
    icon: '📧',
    color: 'bg-red-50 text-red-600 border-red-200',
    buttonColor: 'bg-red-500 hover:bg-red-600',
  },
  {
    id: 'microsoft',
    name: 'Outlook / Hotmail',
    icon: '📨',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    buttonColor: 'bg-blue-500 hover:bg-blue-600',
  },
]

export default function OAuthConnect() {
  const { session } = useAuth()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(null)

  const fetchTokens = useCallback(async () => {
    const { data } = await supabase
      .from('oauth_tokens')
      .select('id, provider, email_address, token_expires_at')

    setTokens(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  function getTokenForProvider(providerId) {
    return tokens.find(t => t.provider === providerId)
  }

  function isExpired(token) {
    if (!token?.token_expires_at) return false
    return new Date(token.token_expires_at) < new Date()
  }

  async function handleConnect(provider) {
    // Build OAuth authorization URL based on provider
    const redirectUri = `${window.location.origin}/oauth/callback`

    if (provider === 'google') {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        alert('Google OAuth no está configurado. Configura VITE_GOOGLE_CLIENT_ID en .env')
        return
      }
      const scope = 'https://www.googleapis.com/auth/gmail.send email profile'
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=google`
      window.location.href = url
    } else if (provider === 'microsoft') {
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID
      if (!clientId) {
        alert('Microsoft OAuth no está configurado. Configura VITE_MICROSOFT_CLIENT_ID en .env')
        return
      }
      const scope = 'https://graph.microsoft.com/Mail.Send email profile openid'
      const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=microsoft`
      window.location.href = url
    }
  }

  async function handleDisconnect(tokenId) {
    setDisconnecting(tokenId)
    try {
      const { error } = await supabase
        .from('oauth_tokens')
        .delete()
        .eq('id', tokenId)

      if (error) throw error

      await supabase.from('audit_log').insert({
        partner_id: session.user.id,
        action: 'oauth_revoked',
        details: { token_id: tokenId },
      })

      await fetchTokens()
    } catch (err) {
      alert('Error al desconectar: ' + (err.message || String(err)))
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-brown-border border-t-terracotta" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Mail size={16} className="text-terracotta" />
        <h3 className="font-heading text-[13px] font-semibold text-brown-dark">
          Correo para envío de cuentas
        </h3>
      </div>
      <p className="font-heading text-[11px] text-brown-light mb-4">
        Conecta tu correo personal para enviar las cuentas de cobro directamente desde tu email.
      </p>

      {PROVIDERS.map(provider => {
        const token = getTokenForProvider(provider.id)
        const expired = isExpired(token)

        return (
          <div
            key={provider.id}
            className={`rounded-xl border px-4 py-3.5 transition-colors ${
              token ? provider.color : 'border-brown-border bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{provider.icon}</span>
                <div>
                  <p className="font-heading text-sm font-medium text-brown-dark">
                    {provider.name}
                  </p>
                  {token && (
                    <p className="font-mono text-[11px] text-brown-light">
                      {token.email_address}
                      {expired && (
                        <span className="ml-2 text-gold-muted font-heading">(token expirado)</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {token ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-sage/10 px-2.5 py-0.5 font-heading text-[10px] font-medium text-sage">
                    <Check size={11} /> Conectado
                  </span>
                  <button
                    onClick={() => handleDisconnect(token.id)}
                    disabled={disconnecting === token.id}
                    className="rounded-lg p-1.5 text-brown-light hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Desconectar"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(provider.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-heading text-xs font-semibold text-white transition-all hover:-translate-y-0.5 ${provider.buttonColor}`}
                >
                  <ExternalLink size={12} />
                  Conectar
                </button>
              )}
            </div>
          </div>
        )
      })}

      <p className="font-heading text-[10px] text-brown-light pt-1">
        Solo necesitas conectar uno. Las cuentas de cobro se enviarán desde tu correo al PM.
      </p>
    </div>
  )
}
