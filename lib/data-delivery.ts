import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'
import { getOptionalSecret } from '@/lib/secrets'

export type DeliveryProvider = 'swiftdata' | 'secondary'

export type DeliveryInput = {
  network: string
  phone: string
  packageSize: string
  requestId: string
  idempotencyKey: string
}

export type DeliveryResult = {
  status: string
  orderId: string | null
  raw: unknown
}

export type DataDeliveryOutcome = {
  ok: boolean
  provider?: DeliveryProvider
  status?: string
  orderId?: string | null
  error?: string
  raw?: unknown
}

const swiftDataBaseUrl = process.env.SWIFTDATA_API_BASE_URL || 'https://lsocdjpflecduumopijn.supabase.co/functions/v1/developer-api'
const secondaryDataBaseUrl =
  process.env.SECONDARY_DATA_API_BASE_URL ||
  process.env.HUBNET_API_BASE_URL ||
  'https://console.hubnet.app/live/api/context/business/transaction'

export const toSwiftNetwork = (network: string) => {
  const value = String(network || '').trim().toUpperCase()
  if (value === 'MTN' || value === 'YELLO' || value === 'MTN_XPRESS') return 'MTN'
  if (value === 'TELECEL' || value === 'VODAFONE' || value === 'VOD' || value === 'RED') return 'TELECEL'
  if (value === 'AIRTELTIGO' || value === 'AT' || value === 'AIRTEL-TIGO') return 'AT'
  if (value === 'GLO') return 'GLO'
  return value
}

/** Normalize Ghana numbers to local 0XXXXXXXXX format for delivery providers. */
export const toDeliveryPhone = (phone: string) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) {
    return `0${digits.slice(3)}`
  }
  if (digits.length === 9) {
    return `0${digits}`
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits
  }
  if (digits.length > 10) {
    return `0${digits.slice(-9)}`
  }
  return digits
}

const toHubnetNetwork = (network: string) => {
  const value = String(network || '').trim().toUpperCase()
  if (value === 'MTN' || value === 'YELLO' || value === 'MTN_XPRESS') return 'mtn'
  if (value === 'AIRTELTIGO' || value === 'AT' || value === 'AIRTEL-TIGO') return 'at'
  if (value === 'TELECEL' || value === 'VODAFONE' || value === 'VOD' || value === 'GLO') return 'big-time'
  return value.toLowerCase()
}

const toHubnetVolume = (packageSize: string) => {
  const normalized = String(packageSize || '').trim().toUpperCase().replace(/\s+/g, '')
  const match = normalized.match(/^(\d+(?:\.\d+)?)(GB|MB)?$/)

  if (!match) {
    return '1'
  }

  const value = Number(match[1])
  const unit = match[2] || 'MB'

  if (!Number.isFinite(value) || value <= 0) {
    return '1'
  }

  const mbValue = unit === 'GB' ? Math.round(value * 1000) : Math.round(value)
  return String(Math.max(1, mbValue))
}

const toHubnetReference = (requestId: string) => {
  const cleaned = String(requestId || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
  const base = cleaned || `REF-${Date.now()}`
  const sliced = base.slice(0, 25)

  return sliced.length >= 6 ? sliced : `${sliced.padEnd(6, '0')}`
}

type SwiftPlan = {
  package_id: string
  network: string
  package_size: string
  api_price: number
  is_unavailable: boolean
}

let swiftPlanCache: { plans: SwiftPlan[]; fetchedAt: number } | null = null
const SWIFT_PLAN_CACHE_TTL_MS = 5 * 60 * 1000

export const fetchSwiftDataPlans = async (apiKey: string): Promise<SwiftPlan[]> => {
  const now = Date.now()
  if (swiftPlanCache && now - swiftPlanCache.fetchedAt < SWIFT_PLAN_CACHE_TTL_MS) {
    return swiftPlanCache.plans
  }
  try {
    const response = await fetch(`${swiftDataBaseUrl}/plans`, {
      headers: { 'X-API-Key': apiKey },
    })
    if (!response.ok) return []
    const data = (await response.json().catch(() => null)) as { success?: boolean; plans?: SwiftPlan[] } | null
    const plans = data?.plans ?? []
    swiftPlanCache = { plans, fetchedAt: now }
    return plans
  } catch {
    return []
  }
}

const resolveSwiftPackageId = async (apiKey: string, network: string, packageSize: string): Promise<string | null> => {
  const plans = await fetchSwiftDataPlans(apiKey)
  if (!plans.length) return null
  const targetNetwork = toSwiftNetwork(network)
  const targetSize = String(packageSize || '').trim().toUpperCase().replace(/\s+/g, '')
  const match = plans.find(
    (plan) =>
      !plan.is_unavailable &&
      toSwiftNetwork(plan.network) === targetNetwork &&
      String(plan.package_size || '').trim().toUpperCase().replace(/\s+/g, '') === targetSize
  )
  return match?.package_id ?? null
}

export const getActiveDeliveryProvider = async (): Promise<DeliveryProvider> => {
  const { data } = await supabaseAdmin
    .from('site_settings')
    .select('delivery_provider')
    .eq('id', 1)
    .maybeSingle()

  const provider = String((data as { delivery_provider?: string | null } | null)?.delivery_provider || 'swiftdata').toLowerCase()
  if (provider === 'secondary') {
    return 'secondary'
  }

  return 'swiftdata'
}

const deliverSwiftDataBundle = async (input: DeliveryInput): Promise<DeliveryResult> => {
  const swiftDataDeveloperKey = await getOptionalSecret(['SWIFTDATA_DEVELOPER_KEY', 'SWIFTDATA_API_KEY'])

  if (!swiftDataDeveloperKey) {
    throw new Error('Missing SwiftData developer key')
  }

  const deliveryPhone = toDeliveryPhone(input.phone)
  const packageId = await resolveSwiftPackageId(swiftDataDeveloperKey, input.network, input.packageSize)

  let endpoint: string
  let requestBody: Record<string, unknown>

  if (packageId) {
    endpoint = `${swiftDataBaseUrl}/payment/data`
    requestBody = {
      package_id: packageId,
      phone: deliveryPhone,
      request_id: input.requestId,
      allow_duplicate: true,
    }
  } else {
    endpoint = `${swiftDataBaseUrl}/buy`
    requestBody = {
      network: toSwiftNetwork(input.network),
      phone: deliveryPhone,
      package_size: input.packageSize,
      request_id: input.requestId,
      allow_duplicate: true,
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-API-Key': swiftDataDeveloperKey,
      Authorization: `Bearer ${swiftDataDeveloperKey}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify(requestBody),
  })

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; status?: string; order_id?: string; error?: string; message?: string; balance?: number }
    | null

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `SwiftData delivery failed (${response.status})`)
  }

  return {
    status: payload?.status || 'processing',
    orderId: payload?.order_id || null,
    raw: payload,
  }
}

const deliverSecondaryDataBundle = async (input: DeliveryInput): Promise<DeliveryResult> => {
  const secondaryDataApiKey = await getOptionalSecret(['SECONDARY_DATA_API_KEY', 'HUBNET_API_KEY'])
  const secondaryDataWebhookUrl = await getOptionalSecret(['SECONDARY_DATA_WEBHOOK_URL', 'HUBNET_WEBHOOK_URL'])

  if (!secondaryDataBaseUrl || !secondaryDataApiKey) {
    throw new Error('Secondary provider is not configured')
  }

  const network = toHubnetNetwork(input.network)
  const endpointBase = secondaryDataBaseUrl.replace(/\/$/, '')
  const endpoint = `${endpointBase}/${network}-new-transaction`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      token: `Bearer ${secondaryDataApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: toDeliveryPhone(input.phone),
      volume: toHubnetVolume(input.packageSize),
      reference: toHubnetReference(input.requestId),
      webhook: secondaryDataWebhookUrl || undefined,
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        status?: boolean
        reason?: string
        code?: string
        message?: string
        transaction_id?: string
        payment_id?: string
        data?: { status?: boolean; code?: string; message?: string }
      }
    | null

  const accepted = response.ok && payload?.status === true && payload?.data?.status === true

  if (!accepted) {
    throw new Error(payload?.reason || payload?.data?.message || payload?.message || `Secondary delivery failed (${response.status})`)
  }

  return {
    status: payload?.data?.code === '0000' ? 'completed' : 'processing',
    orderId: payload?.transaction_id || payload?.payment_id || null,
    raw: payload,
  }
}

export const deliverDataBundleByProvider = async (input: DeliveryInput): Promise<DeliveryResult & { provider: DeliveryProvider }> => {
  const provider = await getActiveDeliveryProvider()
  const normalizedInput = {
    ...input,
    phone: toDeliveryPhone(input.phone),
  }
  const result = provider === 'secondary' ? await deliverSecondaryDataBundle(normalizedInput) : await deliverSwiftDataBundle(normalizedInput)

  return {
    provider,
    ...result,
  }
}

export const fulfillDataOrderDelivery = async (input: {
  orderId: string
  network: string
  packageSize: string
  phone: string
  reference: string
  idempotencyKey: string
  source: string
  existingMetadata?: Record<string, unknown>
}): Promise<DataDeliveryOutcome> => {
  try {
    const delivery = await deliverDataBundleByProvider({
      network: input.network,
      phone: input.phone,
      packageSize: input.packageSize,
      requestId: input.reference,
      idempotencyKey: input.idempotencyKey,
    })

    await supabaseAdmin
      .from('orders')
      .update({
        status: delivery.status === 'completed' || delivery.status === 'delivered' ? 'delivered' : 'processing',
        metadata: {
          ...(input.existingMetadata || {}),
          source: input.source,
          delivery_provider: delivery.provider,
          swift_status: delivery.status,
          swift_order_id: delivery.orderId,
          swift_response: delivery.raw,
          delivery_phone: toDeliveryPhone(input.phone),
        },
      })
      .eq('id', input.orderId)

    return {
      ok: true,
      provider: delivery.provider,
      status: delivery.status,
      orderId: delivery.orderId,
      raw: delivery.raw,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Data delivery failed'

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'failed',
        metadata: {
          ...(input.existingMetadata || {}),
          source: input.source,
          swift_error: message,
          delivery_phone: toDeliveryPhone(input.phone),
        },
      })
      .eq('id', input.orderId)

    return {
      ok: false,
      error: message,
    }
  }
}
