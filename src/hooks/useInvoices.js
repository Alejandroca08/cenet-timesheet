import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { amountToWords } from '../lib/number-to-words-es'

export function useInvoices() {
  const { session, partner } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_periods(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
    }
    setInvoices(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  async function generateInvoice({ year, months, totalHours, hourlyRate }) {
    // Get next invoice number
    const { data: nextNum, error: numError } = await supabase.rpc('next_invoice_number', {
      p_partner_id: session.user.id,
    })
    if (numError) throw numError

    const totalAmount = totalHours * hourlyRate
    const totalAmountWords = amountToWords(totalAmount)

    // Calculate period dates
    const sortedMonths = [...months].sort((a, b) => a - b)
    const firstMonth = sortedMonths[0]
    const lastMonth = sortedMonths[sortedMonths.length - 1]
    const periodStart = `${year}-${String(firstMonth).padStart(2, '0')}-01`
    const lastDay = new Date(year, lastMonth, 0).getDate()
    const periodEnd = `${year}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Insert invoice
    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        partner_id: session.user.id,
        invoice_number: nextNum,
        period_start_date: periodStart,
        period_end_date: periodEnd,
        total_hours: totalHours,
        hourly_rate: hourlyRate,
        total_amount: totalAmount,
        total_amount_words: totalAmountWords,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Insert invoice_periods for each month
    const periodRows = months.map(m => ({
      invoice_id: invoice.id,
      period_year: year,
      period_month: m,
    }))

    const { error: periodsError } = await supabase
      .from('invoice_periods')
      .insert(periodRows)

    if (periodsError) throw periodsError

    // Log to audit
    await supabase.from('audit_log').insert({
      partner_id: session.user.id,
      action: 'invoice_generated',
      details: { invoice_number: nextNum, total_amount: totalAmount, months },
    })

    await fetchInvoices()
    return invoice
  }

  async function uploadPdf(invoiceId, invoiceNumber, pdfBlob, year, month) {
    const path = `${session.user.id}/${year}-${month}/cuenta_cobro_${invoiceNumber}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ pdf_url: path })
      .eq('id', invoiceId)

    if (updateError) throw updateError

    return path
  }

  return { invoices, loading, generateInvoice, uploadPdf, refetch: fetchInvoices }
}
