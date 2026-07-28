import 'server-only'

import { getOptionalSecret } from '@/lib/secrets'
import { formatSmsRecipient } from '@/lib/sms/format'

const TXTCONNECT_ENDPOINT = 'https://api.txtconnect.net/dev/api/sms/send'
const DEFAULT_SENDER_ID = 'FlashDataGH'

export type SendSmsInput = {
  recipient: string
  message: string
  senderId?: string
}

export type SendSmsResult = {
  ok: boolean
  skipped?: boolean
  error?: string
  data?: unknown
}

export const sendTxtConnectSms = async (input: SendSmsInput): Promise<SendSmsResult> => {
  const apiKey = await getOptionalSecret(['TXTCONNECT_API_KEY'])
  if (!apiKey) {
    console.warn('[TxtConnect] Skipping SMS: TXTCONNECT_API_KEY is not configured')
    return { ok: false, skipped: true, error: 'SMS provider not configured' }
  }

  const recipient = formatSmsRecipient(input.recipient)
  if (!recipient) {
    return { ok: false, error: 'Invalid SMS recipient number' }
  }

  const configuredSender =
    input.senderId || (await getOptionalSecret(['TXTCONNECT_SENDER_ID', 'USMSGH_SENDER_ID'])) || DEFAULT_SENDER_ID
  const senderId = configuredSender.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11) || DEFAULT_SENDER_ID

  const response = await fetch(TXTCONNECT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipient,
      from: senderId,
      unicode: 'regular',
      sms: input.message,
    }),
  })

  const result = (await response.json().catch(() => null)) as
    | {
        msg?: string
        messageId?: string
        data?: { status_code?: string; message?: string; in_error?: boolean; reason?: string }
      }
    | null

  const providerMessage = result?.data?.message || result?.msg || ''
  const statusCode = result?.data?.status_code
  const providerFailed =
    result?.data?.in_error === true || (typeof statusCode === 'string' && statusCode !== '000')

  if (!response.ok || providerFailed) {
    const errorMessage = providerMessage || `SMS request failed (${response.status})`
    console.error('[TxtConnect] SMS failed:', { recipient, senderId, errorMessage, statusCode })
    return { ok: false, error: errorMessage }
  }

  return { ok: true, data: result }
}
