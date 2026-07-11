export const formatSmsRecipient = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('233')) {
    return digits
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return `233${digits.slice(1)}`
  }

  if (digits.length === 9) {
    return `233${digits}`
  }

  return null
}
