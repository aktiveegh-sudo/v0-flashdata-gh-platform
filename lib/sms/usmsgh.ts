import 'server-only'

import { getOptionalSecret } from '@/lib/secrets'
import { formatSmsRecipient } from '@/lib/sms/format'
import { sendTxtConnectSms, type SendSmsInput, type SendSmsResult } from '@/lib/sms/txtconnect'

const LEGACY_SMS_ENDPOINT = 'https://webapp.usmsgh.com/api/sms/send'
const DEFAULT_SENDER_ID = 'FlashDataGH'

export type { SendSmsInput, SendSmsResult }

export { formatSmsRecipient }

const sendLegacyUsmsGhSms = async (input: SendSmsInput): Promise<SendSmsResult> => {
  const token = await getOptionalSecret(['USMSGH_API_TOKEN'])
  if (!token) {
    return { ok: false, skipped: true, error: 'Legacy SMS provider not configured' }
  }

  const recipient = formatSmsRecipient(input.recipient)
  if (!recipient) {
    return { ok: false, error: 'Invalid SMS recipient number' }
  }

  const configuredSender = input.senderId || (await getOptionalSecret(['USMSGH_SENDER_ID'])) || DEFAULT_SENDER_ID
  const senderId = configuredSender.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || DEFAULT_SENDER_ID

  const response = await fetch(LEGACY_SMS_ENDPOINT, {
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

export const sendSms = async (input: SendSmsInput): Promise<SendSmsResult> => {
  const txtConnectResult = await sendTxtConnectSms(input)
  if (txtConnectResult.ok || !txtConnectResult.skipped) {
    return txtConnectResult
  }

  return sendLegacyUsmsGhSms(input)
}

export const sendUsmsGhSms = sendSms

type PurchaseSmsKind = 'data' | 'afa' | 'service' | 'airtime' | 'store_data' | 'store_service' | 'store_afa'

export type CustomerOrderSmsSource = 'dashboard' | 'public' | 'store' | 'api'

/** Processing SMS goes out for every purchase channel. */
export const shouldSendCustomerOrderSms = (_source?: string) => true

const buildPurchaseProcessingMessage = (input: {
  reference: string
  itemName?: string | null
  kind: PurchaseSmsKind
}) => {
  const ref = input.reference.trim()
  const item = (input.itemName || '').trim()

  if (input.kind === 'data' || input.kind === 'store_data') {
    const bundle = item ? ` (${item})` : ''
    return `FlashData GH: Your data order${bundle} is being processed. Ref ${ref}. We will notify you when it is complete.`
  }

  if (input.kind === 'afa' || input.kind === 'store_afa') {
    return `FlashData GH: Your AFA registration is being processed. Ref ${ref}. We will notify you when it is complete.`
  }

  if (input.kind === 'airtime') {
    const label = item ? ` (${item})` : ''
    return `FlashData GH: Your airtime order${label} is being processed. Ref ${ref}. We will notify you when it is complete.`
  }

  const label = item || 'order'
  return `FlashData GH: Your ${label} is being processed. Ref ${ref}. We will notify you when it is complete.`
}

const buildPurchaseCompletedMessage = (input: {
  reference: string
  itemName?: string | null
  kind: PurchaseSmsKind
}) => {
  const ref = input.reference.trim()
  const item = (input.itemName || '').trim()

  if (input.kind === 'data' || input.kind === 'store_data') {
    const bundle = item ? ` (${item})` : ''
    return `FlashData GH: Your data bundle${bundle} has been delivered successfully. Ref ${ref}. Thank you for choosing FlashData GH.`
  }

  if (input.kind === 'afa' || input.kind === 'store_afa') {
    return `FlashData GH: Your AFA registration is complete. Ref ${ref}. Thank you for choosing FlashData GH.`
  }

  if (input.kind === 'airtime') {
    const label = item ? ` (${item})` : ''
    return `FlashData GH: Your airtime order${label} is complete. Ref ${ref}. Thank you for choosing FlashData GH.`
  }

  const label = item || 'order'
  return `FlashData GH: Your ${label} is complete. Ref ${ref}. Thank you for choosing FlashData GH.`
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

  return sendSms({
    recipient: phone,
    message: buildPurchaseProcessingMessage(input),
  })
}

export const sendPurchaseCompletedSms = async (input: {
  phone?: string | null
  reference: string
  itemName?: string | null
  kind: PurchaseSmsKind
}) => {
  const phone = (input.phone || '').trim()
  if (!phone || phone.toUpperCase() === 'N/A') {
    return { ok: false, skipped: true, error: 'No customer phone for SMS' }
  }

  return sendSms({
    recipient: phone,
    message: buildPurchaseCompletedMessage(input),
  })
}

export const sendAdminBroadcastSms = async (input: { phone: string; message: string }) => {
  const phone = input.phone.trim()
  if (!phone) {
    return { ok: false, skipped: true, error: 'No phone number' }
  }

  return sendSms({
    recipient: phone,
    message: input.message.trim(),
  })
}
