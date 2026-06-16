import 'server-only'

import { getOptionalSecret } from '@/lib/secrets'

const SMS_ENDPOINT = 'https://webapp.usmsgh.com/api/sms/send'
const DEFAULT_SENDER_ID = 'FlashDataGH'

type SendSmsInput = {
  recipient: string
  message: string
  senderId?: string
}

type SendSmsResult = {
  ok: boolean
  skipped?: boolean
  error?: string
  data?: unknown
}

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

export const sendUsmsGhSms = async (input: SendSmsInput): Promise<SendSmsResult> => {
  const token = await getOptionalSecret(['USMSGH_API_TOKEN'])
  if (!token) {
    console.warn('[USMS-GH] Skipping SMS: USMSGH_API_TOKEN is not configured')
    return { ok: false, skipped: true, error: 'SMS provider not configured' }
  }

  const recipient = formatSmsRecipient(input.recipient)
  if (!recipient) {
    return { ok: false, error: 'Invalid SMS recipient number' }
  }

  const configuredSender = input.senderId || (await getOptionalSecret(['USMSGH_SENDER_ID'])) || DEFAULT_SENDER_ID
  const senderId = configuredSender.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || DEFAULT_SENDER_ID

  const response = await fetch(SMS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      message: input.message,
    }),
  })

  const result = (await response.json().catch(() => null)) as
    | { status?: string; message?: string; data?: unknown }
    | null

  if (!response.ok || result?.status === 'error') {
    const errorMessage = result?.message || `SMS request failed (${response.status})`
    console.error('[USMS-GH] SMS failed:', { recipient, senderId, errorMessage })
    return { ok: false, error: errorMessage }
  }

  return { ok: true, data: result?.data }
}

type PurchaseSmsKind = 'data' | 'afa' | 'service' | 'store_data' | 'store_service' | 'store_afa'

const buildPurchaseProcessingMessage = (input: {
  reference: string
  itemName?: string | null
  kind: PurchaseSmsKind
}) => {
  const ref = input.reference.trim()
  const item = (input.itemName || '').trim()

  if (input.kind === 'data' || input.kind === 'store_data') {
    const bundle = item ? ` (${item})` : ''
    return `FlashData GH: Your data bundle${bundle} is being processed. Ref ${ref}. Thank you for your purchase.`
  }

  if (input.kind === 'afa' || input.kind === 'store_afa') {
    return `FlashData GH: Your AFA registration is being processed. Ref ${ref}. Thank you for your purchase.`
  }

  const label = item || 'order'
  return `FlashData GH: Your ${label} is being processed. Ref ${ref}. Thank you for your purchase.`
}

export const sendPurchaseProcessingSms = async (input: {
  phone?: string | null
  reference: string
  itemName?: string | null
  kind: PurchaseSmsKind
}) => {
  const phone = (input.phone || '').trim()
  if (!phone || phone.toUpperCase() === 'N/A') {
    return { ok: false, skipped: true, error: 'No customer phone for SMS' }
  }

  return sendUsmsGhSms({
    recipient: phone,
    message: buildPurchaseProcessingMessage(input),
  })
}
