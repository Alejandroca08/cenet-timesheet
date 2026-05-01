import { forwardRef } from 'react'
import { formatCOP } from '../../lib/format'

const MONTH_NAMES = [
  '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatInvoiceDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate()
  const month = MONTH_NAMES[d.getMonth() + 1]
  const year = d.getFullYear()
  return `${day} de ${month} de ${year}`
}

const InvoicePreview = forwardRef(function InvoicePreview({ invoice, partner, projectNames }, ref) {
  if (!invoice || !partner) return null

  const today = new Date()
  const dateStr = `${today.getDate()} de ${MONTH_NAMES[today.getMonth() + 1]} de ${today.getFullYear()}`

  return (
    <div
      ref={ref}
      className="bg-white mx-auto"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '60px 70px',
        fontFamily: "'Source Serif 4', Georgia, serif",
        color: '#2c2418',
        fontSize: '14px',
        lineHeight: '1.8',
      }}
    >
      {/* Date and city */}
      <p style={{ marginBottom: '40px' }}>
        Bogotá D.C. {dateStr}
      </p>

      {/* Invoice title */}
      <h1 style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: '22px',
        fontWeight: 700,
        marginBottom: '30px',
        color: '#2c2418',
      }}>
        Cuenta de cobro #{invoice.invoice_number}
      </h1>

      {/* Company info */}
      <div style={{ marginBottom: '30px' }}>
        <p style={{ fontWeight: 600 }}>COMERCIO ELECTRÓNICO EN INTERNET CENET SA</p>
        <p>Nit. 830057860</p>
      </div>

      {/* DEBE A */}
      <p style={{ fontWeight: 600, marginBottom: '10px', color: '#8b7355', letterSpacing: '1px', fontSize: '12px', textTransform: 'uppercase' }}>
        DEBE A:
      </p>
      <div style={{ marginBottom: '30px' }}>
        <p style={{ fontWeight: 600 }}>{partner.full_name}</p>
        <p>CC. {partner.cc_number}{partner.cc_issued_in ? ` de ${partner.cc_issued_in}` : ''}</p>
      </div>

      {/* LA SUMA DE */}
      <p style={{ fontWeight: 600, marginBottom: '10px', color: '#8b7355', letterSpacing: '1px', fontSize: '12px', textTransform: 'uppercase' }}>
        LA SUMA DE:
      </p>
      <div style={{ marginBottom: '30px' }}>
        <p style={{ fontSize: '16px' }}>
          <span style={{ fontWeight: 600 }}>{invoice.total_amount_words}</span>
          {'  '}
          <span style={{ fontFamily: "'DM Mono', monospace", color: '#c96442', fontWeight: 500 }}>
            ({formatCOP(invoice.total_amount)})
          </span>
        </p>
      </div>

      {/* Por concepto de */}
      <p style={{ fontWeight: 600, marginBottom: '10px', color: '#8b7355', letterSpacing: '1px', fontSize: '12px', textTransform: 'uppercase' }}>
        POR CONCEPTO DE:
      </p>
      <div style={{ marginBottom: '50px' }}>
        <p>
          • {invoice.total_hours} horas de recurso en{' '}
          {projectNames || 'proyectos CENET'} desde el{' '}
          {formatInvoiceDate(invoice.period_start_date)} hasta el{' '}
          {formatInvoiceDate(invoice.period_end_date)}.
        </p>
      </div>

      {/* Signature area */}
      <div style={{ marginTop: '60px' }}>
        <p style={{ marginBottom: '8px' }}>Cordialmente,</p>
        <div style={{ marginTop: '40px', borderTop: '1px solid #e8ddd0', paddingTop: '12px', maxWidth: '300px' }}>
          <p style={{ fontWeight: 600 }}>{partner.full_name}</p>
          <p>CC. {partner.cc_number}</p>
          {partner.bank_name && partner.bank_account_number && (
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#8b7355' }}>
              {partner.bank_account_type} {partner.bank_name} No. {partner.bank_account_number}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

export default InvoicePreview
