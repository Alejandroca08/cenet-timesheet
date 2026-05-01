import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function useAdmin(year, month) {
  const { session } = useAuth()
  const [partners, setPartners] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Refresh materialized view first (silently)
      try { await supabase.rpc('refresh_monthly_stats') } catch {}

      // Fetch team readiness from materialized view and all active partners in parallel
      const [readinessResult, allPartnersResult, auditResult] = await Promise.all([
        supabase.rpc('get_team_readiness', { p_year: year, p_month: month }),
        supabase.from('partners').select('id, full_name').eq('is_active', true).order('full_name'),
        supabase.from('audit_log').select('*, partners(full_name)').order('created_at', { ascending: false }).limit(15),
      ])

      if (readinessResult.error) throw readinessResult.error

      const readiness = readinessResult.data ?? []
      const allActive = allPartnersResult.data ?? []

      // Merge: all active partners with readiness data (left join)
      const readinessMap = new Map(readiness.map(r => [r.partner_id, r]))
      const merged = allActive.map(p => {
        const r = readinessMap.get(p.id)
        return {
          partner_id: p.id,
          full_name: p.full_name,
          total_hours: r?.total_hours ?? 0,
          task_count: r?.task_count ?? 0,
          period_status: r?.period_status ?? null,
          marked_ready_at: r?.marked_ready_at ?? null,
        }
      })

      setPartners(merged)
      setAuditLog(auditResult.data ?? [])
    } catch (err) {
      console.error('Error fetching admin data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  async function sendNudge(partnerId) {
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        partner_id: partnerId,
        type: 'nudge_pending',
        channel: 'telegram',
        status: 'pending',
        payload: { year, month, message: 'Todavía no has marcado tu período como listo.' },
      })

    if (insertError) throw insertError

    await supabase.from('audit_log').insert({
      partner_id: session.user.id,
      action: 'period_sent',
      details: { action_type: 'nudge', target_partner_id: partnerId, year, month },
    })
  }

  async function batchSend() {
    // Call RPC to mark all 'ready' periods as 'sent'
    const { data: affected, error: rpcError } = await supabase.rpc('batch_mark_sent', {
      p_year: year,
      p_month: month,
    })

    if (rpcError) throw rpcError

    // Insert notifications for each partner that was ready
    const readyPartners = partners.filter(p => p.period_status === 'ready')
    if (readyPartners.length > 0) {
      const notifications = readyPartners.map(p => ({
        partner_id: p.partner_id,
        type: 'batch_sent',
        channel: 'telegram',
        status: 'pending',
        payload: { year, month, message: 'Tu cuenta de cobro fue procesada.' },
      }))

      await supabase.from('notifications').insert(notifications)
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      partner_id: session.user.id,
      action: 'period_sent',
      details: {
        action_type: 'batch_send',
        year,
        month,
        affected_count: affected,
        partner_ids: readyPartners.map(p => p.partner_id),
      },
    })

    // Refresh data
    await fetchData()
    return affected
  }

  return { partners, auditLog, loading, error, refetch: fetchData, sendNudge, batchSend }
}
