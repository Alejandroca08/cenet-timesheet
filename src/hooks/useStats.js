import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStats(year, month) {
  const [stats, setStats] = useState(null)
  const [allStats, setAllStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch current month stats
      const { data, error: rpcError } = await supabase.rpc('get_my_monthly_stats', {
        p_year: year,
        p_month: month,
      })

      if (rpcError) throw rpcError
      setStats(data?.[0] ?? null)

      // Fetch all months for trend chart
      const { data: allData, error: allError } = await supabase.rpc('get_my_monthly_stats')
      if (allError) throw allError
      setAllStats(allData ?? [])
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, allStats, loading, error, refetch: fetchStats }
}
