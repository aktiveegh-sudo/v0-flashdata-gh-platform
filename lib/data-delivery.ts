import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'
import { getOptionalSecret } from '@/lib/secrets'
import { maybeSendOrderStatusSms } from '@/lib/sms/order-status'

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

/** SwiftData Reseller API (primary). */
const swiftResellerBaseUrl = (
  process.env.SWIFTDATA_API_BASE_URL ||
  'https://ihrvvniomtoofrjkmalb.supabase.co/functions/v1/api'
).replace(/\/$/, '')

const secondaryDataBaseUrl =
  process.env.SECONDARY_DATA_API_BASE_URL ||
  process.env.HUBNET_API_BASE_URL ||
  'https://console.hubnet.app/live/api/context/business/transaction'

/** Map local package network labels to Swift Reseller network IDs. */
export const toSwiftResellerNetwork = (network: string): string => {
  const value = String(network || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '')

  if (value === 'MTN' || value === 'YELLO' || value === 'MTNXPRESS' || value === 'MTN_XPRESS') {
    return 'yello'
  }

  if (value === 'TELECEL' || value === 'VODAFONE' || value === 'VOD' || value === 'RED') {
    return 'telecel'
  }

  if (value.includes('BIGTIME') || value === 'ATBIGTIME' || value === 'AT_BIGTIME') {
    return 'at_bigtime'
  }

  if (
    value.includes('ISHARE') ||
    value === 'AIRTELTIGO' ||
    value === 'AT' ||
    value === 'ATISHARE' ||
    value === 'AT_ISHARE'
  ) {
    return 'at_ishare'
  }

  if (value === 'GLO') {
    return 'telecel'
  }

  return value.toLowerCase()
}

/** @deprecated Prefer toSwiftResellerNetwork — kept for older imports. */
export const toSwiftNetwork = (network: string) => {
  const reseller = toSwiftResellerNetwork(network)
  if (reseller === 'yello') return 'MTN'
  if (reseller === 'telecel') return 'TELECEL'
  if (reseller === 'at_ishare' || reseller === 'at_bigtime') return 'AT'
  return String(network || '').trim().toUpperCase()
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

/** Convert package size strings like "1GB", "2 GB", "500MB" to size_gb for the reseller API. */
export const toSwiftSizeGb = (packageSize: string): number => {
  const normalized = String(packageSize || '').trim().toUpperCase().replace(/\s+/g, '')
  const match = normalized.match(/^(\d+(?:\.\d+)?)(GB|MB)?$/)

  if (!match) {
    const asNumber = Number(normalized)
    return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 1
  }

  const value = Number(match[1])
  const unit = match[2] || 'GB'

  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }

  if (unit === 'MB') {
    return Number((value / 1000).toFixed(3))
  }

  return value
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

type SwiftResellerPackage = {
  network: string
  network_label?: string
  size_gb: number
  price: number
  validity?: string
}

let swiftPackageCache: { packages: SwiftResellerPackage[]; fetchedAt: number } | null = null
const SWIFT_PACKAGE_CACHE_TTL_MS = 5 * 60 * 1000

export const fetchSwiftResellerPackages = async (apiKey: string): Promise<SwiftResellerPackage[]> => {
  const now = Date.now()
  if (swiftPackageCache && now - swiftPackageCache.fetchedAt < SWIFT_PACKAGE_CACHE_TTL_MS) {
    return swiftPackageCache.packages
  }

  try {
    const response = await fetch(`${swiftResellerBaseUrl}/v1/packages`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) return []

    const data = (await response.json().catch(() => null)) as
      | { success?: boolean; packages?: SwiftResellerPackage[] }
      | null

    const packages = data?.packages ?? []
    swiftPackageCache = { packages, fetchedAt: now }
    return packages
  } catch {
    return []
  }
}

/** @deprecated Old developer-api plan list — maps to reseller packages for compatibility. */
export const fetchSwiftDataPlans = async (apiKey: string) => {
  const packages = await fetchSwiftResellerPackages(apiKey)
  return packages.map((pkg) => ({
    package_id: `${pkg.network}-${pkg.size_gb}`,
    network: pkg.network === 'yello' ? 'MTN' : pkg.network,
    package_size: `${pkg.size_gb}GB`,
    api_price: pkg.price,
    is_unavailable: false,
  }))
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
  const apiKey = await getOptionalSecret(['SWIFTDATA_DEVELOPER_KEY', 'SWIFTDATA_API_KEY', 'SWIFT_RESELLER_API_KEY'])

  if (!apiKey) {
    throw new Error('Missing Swift Reseller API key (SWIFTDATA_DEVELOPER_KEY)')
  }

  const deliveryPhone = toDeliveryPhone(input.phone)
  const network = toSwiftResellerNetwork(input.network)
  const sizeGb = toSwiftSizeGb(input.packageSize)

  if (!['yello', 'at_ishare', 'at_bigtime', 'telecel'].includes(network)) {
    throw new Error(`Unsupported Swift Reseller network: ${input.network}`)
  }

  const response = await fetch(`${swiftResellerBaseUrl}/v1/buy-data`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      phone: deliveryPhone,
      network,
      size_gb: sizeGb,
      reference: input.requestId,
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean
        error?: string
        message?: string
        order?: {
          reference?: string
          phone?: string
          network?: string
          size_gb?: number
          amount?: number
          status?: string
        }
      }
    | null

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `Swift Reseller delivery failed (${response.status})`)
  }

  const orderStatus = String(payload?.order?.status || 'processing').toLowerCase()
  const mappedStatus =
    orderStatus === 'completed' || orderStatus === 'delivered'
      ? 'completed'
      : orderStatus === 'failed'
        ? 'failed'
        : orderStatus === 'pending'
          ? 'pending'
          : 'processing'

  return {
    status: mappedStatus,
    orderId: payload?.order?.reference || null,
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
  itemName?: string | null
}): Promise<DataDeliveryOutcome> => {
  try {
    const delivery = await deliverDataBundleByProvider({
      network: input.network,
      phone: input.phone,
      packageSize: input.packageSize,
      requestId: input.reference,
      idempotencyKey: input.idempotencyKey,
    })

    const nextStatus = delivery.status === 'completed' || delivery.status === 'delivered' ? 'delivered' : 'processing'

    await supabaseAdmin
      .from('orders')
      .update({
        status: nextStatus,
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

    if (nextStatus === 'delivered') {
      const network = String(input.network || '').trim().toUpperCase()
      await maybeSendOrderStatusSms({
        phone: input.phone,
        reference: input.reference,
        itemName: input.itemName || `${input.packageSize} ${input.network}`,
        kind: network === 'AFA' ? 'afa' : 'data',
        source: input.source.startsWith('dashboard') ? 'dashboard' : input.source,
        status: 'delivered',
      }).catch((error) => {
        console.error('[SMS] Completed order SMS failed:', error instanceof Error ? error.message : error)
      })
    }

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
