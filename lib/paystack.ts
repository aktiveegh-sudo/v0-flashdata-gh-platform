import crypto from 'crypto'
import { createPendingTransaction, generateReference, notifyAdminsOfNewOrder, supabaseAdmin } from '@/lib/api/rest'
import { getOptionalSecret, getRequiredSecret } from './secrets'

export type PaystackFlow =
  | 'wallet_topup'
  | 'dashboard_data'
  | 'dashboard_afa'
  | 'store_data'
  | 'store_service'
  | 'store_afa'
  | 'public_data'
  | 'public_service'
  | 'public_afa'

type PaystackMetadata = {
  flow: PaystackFlow
  redirectPath: string
  baseAmount?: number
  chargeAmount?: number
  chargeRate?: number
  userId?: string
  storeId?: string
  packageId?: string
  serviceId?: string
  phone?: string
  fullName?: string
  ghanaCardNumber?: string
  location?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  paymentMethod?: string
}

type PaystackInitializeArgs = {
  email: string
  amount: number
  callbackUrl: string
  metadata: PaystackMetadata
  channels?: string[]
}

type PaystackVerifyResponse = {
  status: boolean
  message: string
  data?: {
    status: string
    reference: string
    amount: number
    currency: string
    channel: string
    paid_at?: string | null
    customer?: { email?: string | null }
    metadata?: PaystackMetadata | null
  }
}

type FulfillmentResult = {
  ok: boolean
  redirectPath: string
  message: string
}

type DeliveryProvider = 'swiftdata' | 'secondary'

type DeliveryInput = {
  network: string
  phone: string
  packageSize: string
  requestId: string
  idempotencyKey: string
}

type DeliveryResult = {
  status: string
  orderId: string | null
  raw: unknown
}

const paystackBaseUrl = 'https://api.paystack.co'
const swiftDataBaseUrl = process.env.SWIFTDATA_API_BASE_URL || 'https://lsocdjpflecduumopijn.supabase.co/functions/v1/developer-api'
const secondaryDataBaseUrl =
  process.env.SECONDARY_DATA_API_BASE_URL ||
  process.env.HUBNET_API_BASE_URL ||
  'https://console.hubnet.app/live/api/context/business/transaction'
const paystackChargeRate = 0.03

const getPaystackSecretKey = async () => {
  return getRequiredSecret(['PAYSTACK_SECRET_KEY'], 'Missing PAYSTACK_SECRET_KEY secret value')
}

const getPaystackHeaders = async () => ({
  Authorization: `Bearer ${await getPaystackSecretKey()}`,
  'Content-Type': 'application/json',
})

const toKobo = (amount: number) => Math.round(Number(amount || 0) * 100)
const fromKobo = (amount: number) => Number((Number(amount || 0) / 100).toFixed(2))
const roundMoney = (amount: number) => Number(Number(amount || 0).toFixed(2))
const amountsDifferMeaningfully = (a: number, b: number) => Math.abs(Number(a || 0) - Number(b || 0)) > 0.01

const normalizeStoreCustomerPhone = (value: string) => value.trim()

const toSwiftNetwork = (network: string) => {
  const value = String(network || '').trim().toUpperCase()
  if (value === 'MTN' || value === 'YELLO' || value === 'MTN_XPRESS') return 'MTN'
  if (value === 'TELECEL' || value === 'VODAFONE' || value === 'VOD' || value === 'RED') return 'TELECEL'
  if (value === 'AIRTELTIGO' || value === 'AT') return 'AT'
  if (value === 'GLO') return 'GLO'
  return value
}

const toHubnetNetwork = (network: string) => {
  const value = String(network || '').trim().toUpperCase()
  if (value === 'MTN' || value === 'YELLO' || value === 'MTN_XPRESS') return 'mtn'
  if (value === 'AIRTELTIGO' || value === 'AT') return 'at'
  if (value === 'TELECEL' || value === 'VODAFONE' || value === 'VOD' || value === 'GLO') return 'big-time'
  return value.toLowerCase()
}

const toHubnetPhone = (phone: string) => {
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

const firstJoinedRow = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
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

const fetchSwiftDataPlans = async (apiKey: string): Promise<SwiftPlan[]> => {
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
    p =>
      !p.is_unavailable &&
      toSwiftNetwork(p.network) === targetNetwork &&
      String(p.package_size || '').trim().toUpperCase().replace(/\s+/g, '') === targetSize,
  )
  return match?.package_id ?? null
}

const getActiveDeliveryProvider = async (): Promise<DeliveryProvider> => {
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

  // Try to resolve a specific package_id via GET /plans (new /payment/data endpoint)
  const packageId = await resolveSwiftPackageId(swiftDataDeveloperKey, input.network, input.packageSize)

  let endpoint: string
  let requestBody: Record<string, unknown>

  if (packageId) {
    endpoint = `${swiftDataBaseUrl}/payment/data`
    requestBody = {
      package_id: packageId,
      phone: input.phone,
      request_id: input.requestId,
      allow_duplicate: true,
    }
  } else {
    // Legacy fallback: /buy with network + package_size
    endpoint = `${swiftDataBaseUrl}/buy`
    requestBody = {
      network: toSwiftNetwork(input.network),
      phone: input.phone,
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
      phone: toHubnetPhone(input.phone),
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

const deliverDataBundleByProvider = async (input: DeliveryInput): Promise<DeliveryResult & { provider: DeliveryProvider }> => {
  const provider = await getActiveDeliveryProvider()
  const result = provider === 'secondary' ? await deliverSecondaryDataBundle(input) : await deliverSwiftDataBundle(input)

  return {
    provider,
    ...result,
  }
}

const findStoreOrderByReference = async (storeId: string, reference: string) => {
  const paymentPrefix = `Paystack Ref: ${reference}`

  const { data, error } = await supabaseAdmin
    .from('agent_store_orders')
    .select('id')
    .eq('store_id', storeId)
    .ilike('customer_note', `${paymentPrefix}%`)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

const insertStoreSaleTransaction = async (input: {
  sellerId: string
  amount: number
  reference: string
  description: string
  metadata: Record<string, unknown>
}) => {
  const transactionReference = `${input.reference}-SALE`

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('reference', transactionReference)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    return
  }

  const { error } = await supabaseAdmin.from('transactions').insert({
    user_id: input.sellerId,
    type: 'store_sale',
    amount: input.amount,
    status: 'success',
    description: input.description,
    reference: transactionReference,
    wallet_applied: false,
    metadata: input.metadata,
  })

  if (error) {
    throw new Error(error.message)
  }
}

const ensureSuccessfulCharge = (payload: PaystackVerifyResponse) => {
  if (!payload.status || !payload.data) {
    throw new Error(payload.message || 'Unable to verify Paystack transaction')
  }

  if (payload.data.status !== 'success') {
    throw new Error(`Payment status is ${payload.data.status}`)
  }

  return payload.data
}

export const initializePaystackTransaction = async (args: PaystackInitializeArgs) => {
  const baseAmount = roundMoney(args.amount)
  const chargeAmount = roundMoney(baseAmount * paystackChargeRate)
  const payableAmount = roundMoney(baseAmount + chargeAmount)

  const response = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
    method: 'POST',
    headers: await getPaystackHeaders(),
    body: JSON.stringify({
      email: args.email,
      amount: toKobo(payableAmount),
      currency: 'GHS',
      callback_url: args.callbackUrl,
      channels: args.channels,
      metadata: {
        ...args.metadata,
        baseAmount,
        chargeAmount,
        chargeRate: paystackChargeRate,
      },
      reference: generateReference('PSTK'),
    }),
  })

  const payload = (await response.json()) as {
    status: boolean
    message: string
    data?: { authorization_url: string; access_code: string; reference: string }
  }

  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || 'Unable to initialize Paystack payment')
  }

  return payload.data
}

export const verifyPaystackTransaction = async (reference: string) => {
  const response = await fetch(`${paystackBaseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: await getPaystackHeaders(),
  })

  const payload = (await response.json()) as PaystackVerifyResponse

  if (!response.ok) {
    throw new Error(payload.message || 'Unable to verify Paystack transaction')
  }

  return payload
}

export const verifyPaystackSignature = async (rawBody: string, signature: string | null) => {
  if (!signature) {
    return false
  }

  const digest = crypto.createHmac('sha512', await getPaystackSecretKey()).update(rawBody).digest('hex')
  return digest === signature
}

export const fulfillPaystackPayment = async (reference: string): Promise<FulfillmentResult> => {
  const payload = await verifyPaystackTransaction(reference)
  const charge = ensureSuccessfulCharge(payload)
  const metadata = charge.metadata

  if (!metadata?.flow || !metadata.redirectPath) {
    throw new Error('Missing Paystack payment metadata')
  }

  const paidAmount = fromKobo(charge.amount)
  const baseAmount = roundMoney(Number(metadata.baseAmount || 0))
  const amount = baseAmount > 0 ? baseAmount : paidAmount
  const transactionCharge = roundMoney(Math.max(0, Number(metadata.chargeAmount || paidAmount - amount)))

  if (metadata.flow === 'wallet_topup') {
    if (!metadata.userId) {
      throw new Error('Missing wallet top-up user')
    }

    const { data: existing } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabaseAdmin.from('transactions').insert({
        user_id: metadata.userId,
        type: 'wallet',
        amount,
        status: 'success',
        description: 'Wallet top-up via Paystack',
        reference,
        wallet_applied: false,
        metadata: {
          source: 'paystack',
          flow: metadata.flow,
          channel: charge.channel,
          email: charge.customer?.email || null,
          payment_method: metadata.paymentMethod || null,
          credited_amount: amount,
          paid_amount: paidAmount,
          transaction_charge: transactionCharge,
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      // Fallback for environments where wallet trigger is missing/outdated.
      const { data: insertedTransaction } = await supabaseAdmin
        .from('transactions')
        .select('id,wallet_applied')
        .eq('reference', reference)
        .maybeSingle()

      if (!insertedTransaction?.wallet_applied) {
        const { error: walletDeltaError } = await supabaseAdmin.rpc('wallet_apply_delta', {
          p_user_id: metadata.userId,
          p_delta: amount,
          p_reason: 'wallet_topup_paystack',
          p_reference: reference,
          p_metadata: {
            source: 'paystack',
            flow: metadata.flow,
            channel: charge.channel,
            credited_amount: amount,
            paid_amount: paidAmount,
            transaction_charge: transactionCharge,
          },
        })

        if (walletDeltaError) {
          throw new Error(walletDeltaError.message)
        }

        await supabaseAdmin
          .from('transactions')
          .update({ wallet_applied: true })
          .eq('reference', reference)
          
          // Touch the wallets row to ensure realtime clients receive an update
          try {
            await supabaseAdmin
              .from('wallets')
              .update({ updated_at: new Date().toISOString() })
              .eq('user_id', metadata.userId)
          } catch (_) {
            // Non-fatal: realtime update attempt failed, but wallet was credited.
          }
      }
    }

    return {
      ok: true,
      redirectPath: metadata.redirectPath,
      message: 'Wallet funded successfully',
    }
  }

  if (metadata.flow === 'dashboard_data') {
    if (!metadata.userId || !metadata.packageId || !metadata.phone) {
      throw new Error('Missing dashboard data payment details')
    }

    const { data: packageRow, error: packageError } = await supabaseAdmin
      .from('data_packages')
      .select('id,network,amount,agent_price,selling_price,is_active')
      .eq('id', metadata.packageId)
      .eq('is_active', true)
      .maybeSingle()

    if (packageError || !packageRow) {
      throw new Error(packageError?.message || 'Data package not found')
    }

    const packageAgentPrice = Number(packageRow.agent_price || packageRow.selling_price || 0)

    const hasDashboardDataAmountDrift = amountsDifferMeaningfully(packageAgentPrice, amount)

    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('reference', reference)
      .maybeSingle()

    if (existingOrderError) {
      throw new Error(existingOrderError.message)
    }

    if (!existingOrder) {
      const { data: createdOrder, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          user_id: metadata.userId,
          package_id: packageRow.id,
          phone: metadata.phone,
          amount,
          status: 'pending',
          reference,
          metadata: {
            source: 'paystack',
            payment_channel: charge.channel,
            amount_validation: hasDashboardDataAmountDrift ? 'price_changed_after_checkout' : 'ok',
            package_price_now: packageAgentPrice,
            amount_paid: amount,
          },
        })
        .select('id')
        .single()

      if (orderError) {
        throw new Error(orderError.message)
      }

      const transactionError = await createPendingTransaction({
        userId: metadata.userId,
        type: 'data_purchase',
        amount,
        description: `${packageRow.amount} ${packageRow.network} Data Bundle via Paystack`,
        reference: `${reference}-PAY`,
        metadata: {
          source: 'paystack',
          channel: charge.channel,
          order_id: createdOrder.id,
          order_reference: reference,
        },
      })

      if (transactionError) {
        throw new Error('Unable to log Paystack data transaction')
      }

      void notifyAdminsOfNewOrder({
        kind: 'data',
        reference,
        amount,
        source: 'dashboard',
        customerPhone: metadata.phone,
      })

      try {
        const delivery = await deliverDataBundleByProvider({
          network: packageRow.network,
          phone: metadata.phone,
          packageSize: packageRow.amount,
          requestId: reference,
          idempotencyKey: `dash-${reference}`,
        })

        const deliveredStatus =
          delivery.status === 'fulfilled' || delivery.status === 'success' || delivery.status === 'completed'
            ? 'success'
            : 'pending'

        await supabaseAdmin
          .from('orders')
          .update({
            status: deliveredStatus,
            metadata: {
              source: 'paystack',
              payment_channel: charge.channel,
              delivery_provider: delivery.provider,
              swift_status: delivery.status,
              swift_order_id: delivery.orderId,
              swift_response: delivery.raw,
            },
          })
          .eq('id', createdOrder.id)

        await supabaseAdmin
          .from('transactions')
          .update({
            status: deliveredStatus,
            metadata: {
              source: 'paystack',
              channel: charge.channel,
              order_id: createdOrder.id,
              order_reference: reference,
              delivery_provider: delivery.provider,
              swift_status: delivery.status,
              swift_order_id: delivery.orderId,
            },
          })
          .eq('reference', `${reference}-PAY`)
      } catch (deliveryError) {
        const deliveryMessage = deliveryError instanceof Error ? deliveryError.message : 'SwiftData delivery failed'

        await supabaseAdmin
          .from('orders')
          .update({
            status: 'failed',
            metadata: {
              source: 'paystack',
              payment_channel: charge.channel,
              swift_error: deliveryMessage,
            },
          })
          .eq('id', createdOrder.id)

        await supabaseAdmin
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              source: 'paystack',
              channel: charge.channel,
              order_id: createdOrder.id,
              order_reference: reference,
              swift_error: deliveryMessage,
            },
          })
          .eq('reference', `${reference}-PAY`)
      }
    }

    return {
      ok: true,
      redirectPath: metadata.redirectPath,
      message: 'Data purchase submitted successfully',
    }
  }

  if (metadata.flow === 'dashboard_afa') {
    if (!metadata.userId || !metadata.phone || !metadata.fullName || !metadata.ghanaCardNumber || !metadata.location) {
      throw new Error('Missing AFA payment details')
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('afa_settings')
      .select('base_price,agent_price,is_active')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError || !settings?.is_active) {
      throw new Error(settingsError?.message || 'AFA registration is unavailable')
    }

    const afaAgentPrice = Number(settings.agent_price || settings.base_price || 0)

    const hasDashboardAfaAmountDrift = amountsDifferMeaningfully(afaAgentPrice, amount)

    const { data: existingRegistration, error: existingRegistrationError } = await supabaseAdmin
      .from('afa_registrations')
      .select('id')
      .eq('reference', reference)
      .maybeSingle()

    if (existingRegistrationError) {
      throw new Error(existingRegistrationError.message)
    }

    if (!existingRegistration) {
      const { data: createdRegistration, error: registrationError } = await supabaseAdmin
        .from('afa_registrations')
        .insert({
          user_id: metadata.userId,
          full_name: metadata.fullName,
          phone: metadata.phone,
          ghana_card_number: metadata.ghanaCardNumber,
          location: metadata.location,
          amount,
          reference,
          status: 'pending',
        })
        .select('id')
        .single()

      if (registrationError) {
        throw new Error(registrationError.message)
      }

      const transactionError = await createPendingTransaction({
        userId: metadata.userId,
        type: 'online_service',
        amount,
        description: 'AFA Registration via Paystack',
        reference: `${reference}-PAY`,
        metadata: {
          source: 'paystack',
          channel: charge.channel,
          registration_id: createdRegistration.id,
          registration_reference: reference,
          amount_validation: hasDashboardAfaAmountDrift ? 'price_changed_after_checkout' : 'ok',
          afa_price_now: afaAgentPrice,
          amount_paid: amount,
        },
      })

      if (transactionError) {
        throw new Error('Unable to log Paystack AFA transaction')
      }

      void notifyAdminsOfNewOrder({
        kind: 'afa',
        reference,
        amount,
        source: 'dashboard',
        customerName: metadata.fullName,
        customerPhone: metadata.phone,
      })
    }

    return {
      ok: true,
      redirectPath: metadata.redirectPath,
      message: 'AFA registration submitted successfully',
    }
  }

  if (metadata.flow === 'public_service' || metadata.flow === 'public_data' || metadata.flow === 'public_afa') {
    if (!metadata.storeId) {
      throw new Error('Missing public checkout store details')
    }

    const { data: storeForPublic, error: storeForPublicError } = await supabaseAdmin
      .from('agent_stores')
      .select('id,agent_id,slug,brand_name')
      .eq('id', metadata.storeId)
      .eq('is_active', true)
      .maybeSingle()

    if (storeForPublicError || !storeForPublic) {
      throw new Error(storeForPublicError?.message || 'Public checkout store is unavailable')
    }

    const publicExistingOrder = await findStoreOrderByReference(storeForPublic.id, reference)

    if (!publicExistingOrder) {
      const publicCustomerName = (metadata.customerName || metadata.fullName || '').trim() || 'Public Customer'
      const publicCustomerPhone = normalizeStoreCustomerPhone(metadata.customerPhone || metadata.phone || '') || 'N/A'
      const publicCustomerEmail = (metadata.customerEmail || charge.customer?.email || '').trim() || `public-${storeForPublic.id.slice(0, 8)}@flashdata.gh`

      let itemType: 'data' | 'service' = 'data'
      let packageId: string | null = null
      let serviceId: string | null = null
      let itemLabel = 'Public purchase'
      let customerNote = `Paystack Ref: ${reference} | Source: public checkout | Payment Status: paid`
      let storeOrderStatus: 'pending' | 'accepted' | 'declined' | 'completed' = 'pending'

      if (metadata.flow === 'public_service') {
        if (!metadata.serviceId || !metadata.phone) {
          throw new Error('Missing public service checkout details')
        }

        itemType = 'service'
        serviceId = metadata.serviceId

        const { data: serviceRow, error: serviceError } = await supabaseAdmin
          .from('online_services')
          .select('id,name,public_price,price,is_active')
          .eq('id', metadata.serviceId)
          .eq('is_active', true)
          .maybeSingle()

        if (serviceError || !serviceRow) {
          throw new Error(serviceError?.message || 'Public service not found')
        }

        const servicePublicPrice = Number(serviceRow.public_price || serviceRow.price || 0)
        const hasPublicServiceAmountDrift = amountsDifferMeaningfully(servicePublicPrice, amount)

        itemLabel = serviceRow.name || 'Public Service'
        if (hasPublicServiceAmountDrift) {
          customerNote = `${customerNote} | Amount Drift: expected ${servicePublicPrice} got ${amount}`
        }
      } else {
        if (!metadata.packageId || !metadata.phone) {
          throw new Error('Missing public data checkout details')
        }

        packageId = metadata.packageId

        const { data: packageRow, error: packageError } = await supabaseAdmin
          .from('data_packages')
          .select('id,name,amount,network,public_price,selling_price,is_active')
          .eq('id', metadata.packageId)
          .eq('is_active', true)
          .maybeSingle()

        if (packageError || !packageRow) {
          throw new Error(packageError?.message || 'Public data package not found')
        }

        const packagePublicPrice = Number(packageRow.public_price || packageRow.selling_price || 0)
        const hasPublicPackageAmountDrift = amountsDifferMeaningfully(packagePublicPrice, amount)

        itemLabel = packageRow.name || 'Public Data'
        if (hasPublicPackageAmountDrift) {
          customerNote = `${customerNote} | Amount Drift: expected ${packagePublicPrice} got ${amount}`
        }

        if (metadata.flow === 'public_afa') {
          const ghanaCardPattern = /^GHA-\d{9}-\d$/i
          if (!metadata.fullName || !metadata.location || !metadata.ghanaCardNumber || !ghanaCardPattern.test(metadata.ghanaCardNumber)) {
            throw new Error('Missing valid public AFA registration details')
          }

          customerNote = [
            `Paystack Ref: ${reference}`,
            'Source: public checkout',
            'Payment Status: paid',
            `Phone: ${metadata.phone || ''}`,
            `Full Name: ${metadata.fullName || ''}`,
            `Ghana Card: ${metadata.ghanaCardNumber || ''}`,
            `Location: ${metadata.location || ''}`,
          ].join(' | ')
        } else {
          customerNote = `${customerNote} | Recipient: ${metadata.phone || ''}`

          try {
            const delivery = await deliverDataBundleByProvider({
              network: packageRow.network || '',
              phone: metadata.phone || publicCustomerPhone,
              packageSize: packageRow.amount || '',
              requestId: `${reference}-PUBLIC`,
              idempotencyKey: `public-${reference}`,
            })

            storeOrderStatus =
              delivery.status === 'fulfilled' || delivery.status === 'success' || delivery.status === 'completed'
                ? 'completed'
                : 'pending'

            customerNote = `${customerNote} | Provider: ${delivery.provider} | Delivery Status: ${delivery.status}${
              delivery.orderId ? ` | Provider Order: ${delivery.orderId}` : ''
            }`
          } catch (deliveryError) {
            const deliveryMessage = deliveryError instanceof Error ? deliveryError.message : 'SwiftData delivery failed'
            storeOrderStatus = 'declined'
            customerNote = `${customerNote} | Swift Error: ${deliveryMessage}`
          }
        }
      }

      const { data: createdPublicOrder, error: createPublicOrderError } = await supabaseAdmin
        .from('agent_store_orders')
        .insert({
          store_id: storeForPublic.id,
          item_type: itemType,
          package_id: packageId,
          service_id: serviceId,
          customer_name: publicCustomerName,
          customer_phone: publicCustomerPhone,
          customer_email: publicCustomerEmail,
          customer_note: customerNote,
          quantity: 1,
          total_price: amount,
          status: storeOrderStatus,
        })
        .select('id')
        .single()

      if (createPublicOrderError) {
        throw new Error(createPublicOrderError.message)
      }

      await insertStoreSaleTransaction({
        sellerId: storeForPublic.agent_id,
        amount,
        reference,
        description: `Public sale - ${itemLabel}`,
        metadata: {
          source: 'paystack',
          checkout: 'public',
          store_id: storeForPublic.id,
          store_slug: storeForPublic.slug,
          order_id: createdPublicOrder.id,
          payment_reference: reference,
        },
      })

      void notifyAdminsOfNewOrder({
        kind: itemType === 'service' ? 'store_service' : metadata.flow === 'public_afa' ? 'store_afa' : 'store_data',
        reference,
        amount,
        source: 'public',
        storeName: storeForPublic.brand_name || storeForPublic.slug,
        itemName: itemLabel,
        customerName: publicCustomerName,
        customerPhone: publicCustomerPhone,
      })
    }

    return {
      ok: true,
      redirectPath: metadata.redirectPath,
      message: 'Payment received and public order submitted successfully',
    }
  }

  if (!metadata.storeId) {
    throw new Error('Missing store checkout details')
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from('agent_stores')
    .select('id,agent_id,slug,brand_name')
    .eq('id', metadata.storeId)
    .maybeSingle()

  if (storeError || !store) {
    throw new Error(storeError?.message || 'Store not found')
  }

  const customerName = (metadata.customerName || metadata.fullName || '').trim() || 'Store Customer'
  const customerPhone = normalizeStoreCustomerPhone(metadata.customerPhone || metadata.phone || '') || 'N/A'
  const customerEmail = (metadata.customerEmail || charge.customer?.email || '').trim() || `store-${store.id.slice(0, 8)}@flashdata.gh`

  const existingStoreOrder = await findStoreOrderByReference(store.id, reference)

  if (!existingStoreOrder) {
    let itemType: 'data' | 'service' = 'data'
    let packageId: string | null = null
    let serviceId: string | null = null
    let itemLabel = 'Store purchase'
    let customerNote = `Paystack Ref: ${reference} | Payment Status: paid`
    let storeOrderStatus: 'pending' | 'accepted' | 'declined' | 'completed' = 'pending'

    if (metadata.flow === 'store_service') {
      if (!metadata.serviceId) {
        throw new Error('Missing service checkout details')
      }

      itemType = 'service'
      serviceId = metadata.serviceId

      const { data: serviceRow, error: serviceError } = await supabaseAdmin
        .from('agent_store_service_prices')
        .select('selling_price,online_services!inner(name,category)')
        .eq('store_id', store.id)
        .eq('service_id', metadata.serviceId)
        .eq('is_active', true)
        .maybeSingle()

      if (serviceError || !serviceRow) {
        throw new Error(serviceError?.message || 'Store service not found')
      }

      const serviceDetails = firstJoinedRow(serviceRow.online_services)

      const hasStoreServiceAmountDrift = amountsDifferMeaningfully(Number(serviceRow.selling_price || 0), amount)

      itemLabel = serviceDetails?.name || 'Store Service'
      if (hasStoreServiceAmountDrift) {
        customerNote = `${customerNote} | Amount Drift: expected ${Number(serviceRow.selling_price || 0)} got ${amount}`
      }
    } else {
      if (!metadata.packageId) {
        throw new Error('Missing store data checkout details')
      }

      packageId = metadata.packageId

      const { data: packageRow, error: packageError } = await supabaseAdmin
        .from('agent_store_packages')
        .select('selling_price,data_packages!inner(name,amount,network)')
        .eq('store_id', store.id)
        .eq('data_package_id', metadata.packageId)
        .eq('is_active', true)
        .maybeSingle()

      if (packageError || !packageRow) {
        throw new Error(packageError?.message || 'Store data package not found')
      }

      const packageDetails = firstJoinedRow(packageRow.data_packages)

      const hasStorePackageAmountDrift = amountsDifferMeaningfully(Number(packageRow.selling_price || 0), amount)

      itemLabel = packageDetails?.name || 'Store Data'
      if (hasStorePackageAmountDrift) {
        customerNote = `${customerNote} | Amount Drift: expected ${Number(packageRow.selling_price || 0)} got ${amount}`
      }

      if (metadata.flow === 'store_afa') {
        customerNote = [
          `Paystack Ref: ${reference}`,
          'Payment Status: paid',
          `Phone: ${metadata.phone || ''}`,
          `Full Name: ${metadata.fullName || ''}`,
          `Ghana Card: ${metadata.ghanaCardNumber || ''}`,
          `Location: ${metadata.location || ''}`,
        ].join(' | ')
      } else {
        customerNote = `${customerNote} | Recipient: ${metadata.phone || ''}`

        try {
          const delivery = await deliverDataBundleByProvider({
            network: packageDetails?.network || '',
            phone: metadata.phone || customerPhone,
            packageSize: packageDetails?.amount || '',
            requestId: `${reference}-STORE`,
            idempotencyKey: `store-${reference}`,
          })

          storeOrderStatus =
            delivery.status === 'fulfilled' || delivery.status === 'success' || delivery.status === 'completed'
              ? 'completed'
              : 'pending'

          customerNote = `${customerNote} | Provider: ${delivery.provider} | Delivery Status: ${delivery.status}${
            delivery.orderId ? ` | Provider Order: ${delivery.orderId}` : ''
          }`
        } catch (deliveryError) {
          const deliveryMessage = deliveryError instanceof Error ? deliveryError.message : 'SwiftData delivery failed'
          storeOrderStatus = 'declined'
          customerNote = `${customerNote} | Swift Error: ${deliveryMessage}`
        }
      }
    }

    const { data: createdOrder, error: createOrderError } = await supabaseAdmin
      .from('agent_store_orders')
      .insert({
        store_id: store.id,
        item_type: itemType,
        package_id: packageId,
        service_id: serviceId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_note: customerNote,
        quantity: 1,
        total_price: amount,
        status: storeOrderStatus,
      })
      .select('id')
      .single()

    if (createOrderError) {
      throw new Error(createOrderError.message)
    }

    await insertStoreSaleTransaction({
      sellerId: store.agent_id,
      amount,
      reference,
      description: `Store sale - ${itemLabel}`,
      metadata: {
        source: 'paystack',
        store_id: store.id,
        store_slug: store.slug,
        order_id: createdOrder.id,
        payment_reference: reference,
      },
    })

    void notifyAdminsOfNewOrder({
      kind: itemType === 'service' ? 'store_service' : metadata.flow === 'store_afa' ? 'store_afa' : 'store_data',
      reference,
      amount,
      source: 'store',
      storeName: store.brand_name || store.slug,
      itemName: itemLabel,
      customerName,
      customerPhone,
    })
  }

  return {
    ok: true,
    redirectPath: metadata.redirectPath,
    message: 'Payment received and order submitted successfully',
  }
}