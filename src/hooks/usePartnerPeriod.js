import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function usePartnerPeriod(year, month) {
  const { session } = useAuth()
  const [period, setPeriod] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPeriod = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('partner_periods')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle()

    if (error) {
      console.error('Error fetching period:', error)
    }
    setPeriod(data)
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    fetchPeriod()
  }, [fetchPeriod])

  async function markReady() {
    if (period) {
      const { data, error } = await supabase
        .from('partner_periods')
        .update({
          status: 'ready',
          marked_ready_at: new Date().toISOString(),
        })
        .eq('id', period.id)
        .select()
        .single()

      if (error) throw error
      setPeriod(data)
      return data
    } else {
      const { data, error } = await supabase
        .from('partner_periods')
        .insert({
          partner_id: session.user.id,
          period_year: year,
          period_month: month,
          status: 'ready',
          marked_ready_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      setPeriod(data)
      return data
    }
  }

  async function unmarkReady() {
    if (!period) return
    const { data, error } = await supabase
      .from('partner_periods')
      .update({
        status: 'in_progress',
        marked_ready_at: null,
      })
      .eq('id', period.id)
      .select()
      .single()

    if (error) throw error
    setPeriod(data)
    return data
  }

  const status = period?.status ?? 'in_progress'

  return { period, status, loading, markReady, unmarkReady, refetch: fetchPeriod }
}
