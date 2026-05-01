import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

/**
 * OAuth callback handler.
 * Receives the authorization code from Google/Microsoft,
 * exchanges it for tokens via a Supabase Edge Function,
 * and stores them in the oauth_tokens table.
 */
export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state') // 'google' or 'microsoft'
      const errorParam = params.get('error')

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`)
        setStatus('error')
        return
      }

      if (!code || !state) {
        setError('Missing authorization code or provider state.')
        setStatus('error')
        return
      }

      if (!session?.user?.id) {
        setError('No active session. Please log in first.')
        setStatus('error')
        return
      }

      try {
        // Call Supabase Edge Function to exchange code for tokens
        const { data, error: fnError } = await supabase.functions.invoke('oauth-exchange', {
          body: {
            code,
            provider: state,
            redirect_uri: `${window.location.origin}/oauth/callback`,
          },
        })

        if (fnError) throw fnError
        if (data?.error) throw new Error(data.error)

        // Store tokens in oauth_tokens table
        const { error: insertError } = await supabase
          .from('oauth_tokens')
          .upsert({
            partner_id: session.user.id,
            provider: state,
            email_address: data.email,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_expires_at: data.expires_at,
          }, {
            onConflict: 'partner_id,provider,email_address',
          })

        if (insertError) throw insertError

        // Log to audit
        await supabase.from('audit_log').insert({
          partner_id: session.user.id,
          action: 'oauth_connected',
          details: { provider: state, email: data.email },
        })

        setStatus('success')
        setTimeout(() => navigate('/profile'), 1500)
      } catch (err) {
        console.error('OAuth exchange error:', err)
        setError(err.message || 'Failed to exchange authorization code.')
        setStatus('error')
      }
    }

    handleCallback()
  }, [session, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="rounded-card border border-brown-border bg-white px-8 py-10 text-center max-w-md">
        {status === 'processing' && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-brown-border border-t-terracotta" />
            <h2 className="font-heading text-lg font-semibold text-brown-dark">
              Conectando tu correo...
            </h2>
            <p className="mt-2 font-heading text-sm text-brown-light">
              Estamos verificando tu autorización.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="font-heading text-lg font-semibold text-brown-dark">
              Correo conectado
            </h2>
            <p className="mt-2 font-heading text-sm text-brown-light">
              Redirigiendo al perfil...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <span className="text-2xl">✗</span>
            </div>
            <h2 className="font-heading text-lg font-semibold text-brown-dark">
              Error de conexión
            </h2>
            <p className="mt-2 font-heading text-sm text-red-500">
              {error}
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-4 rounded-xl bg-brown-dark px-6 py-2.5 font-heading text-sm font-semibold text-cream"
            >
              Volver al perfil
            </button>
          </>
        )}
      </div>
    </div>
  )
}
