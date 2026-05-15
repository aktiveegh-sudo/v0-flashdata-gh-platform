export const ghanaCurrency = (value: number) =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(value)

export const formatDateTime = (iso: string | null) => {
  if (!iso) {
    return '-'
  }

  return new Date(iso).toLocaleString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const generateApiKey = () => {
  const random = crypto.getRandomValues(new Uint8Array(24))
  const chunk = Array.from(random)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')

  return `fd_live_${chunk}`
}

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    return ''
  }

  const headers = Object.keys(rows[0])
  const encodedRows = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        const safe = value == null ? '' : String(value).replace(/"/g, '""')
        return `"${safe}"`
      })
      .join(',')
  )

  return [headers.join(','), ...encodedRows].join('\n')
}
