import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendPurchaseProcessingSms } from '@/lib/sms/usmsgh'

type ApiUser = {
  id: string
  user_id: string
  is_active: boolean
  usage_count: number
  usage_limit: number
}

type WalletRow = {
  id: string
  balance: number | string
}

type TransactionType = 'data_purchase' | 'online_service'

type OrderNotificationKind = 'data' | 'afa' | 'service' | 'store_data' | 'store_service' | 'store_afa'

type NotifyAdminsOfNewOrderInput = {
  kind: OrderNotificationKind
  reference: string
  amount: number
  source: 'dashboard' | 'store' | 'api' | 'public'
  customerName?: string | null
  customerPhone?: string | null
  storeName?: string | null
  itemName?: string | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing server Supabase env vars: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

export const jsonError = (message: string, status = 400) => {
  return NextResponse.json({ success: false, error: message }, { status })
}

export const jsonOk = (data: unknown, status = 200) => {
  return NextResponse.json({ success: true, data }, { status })
}

export const normalizeToGhanaPhone = (value: string): string | null => {
  const digits = (value || '').replace(/\D/g, '')

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+233${digits.slice(1)}`
  }

  if (digits.length === 12 && digits.startsWith('233')) {
    return `+${digits}`
  }

  if ((value || '').trim().startsWith('+233') && digits.length === 12) {
    return `+${digits}`
  }

  return null
}

export const generateReference = (prefix: string) => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${random}`
}

const getBearerToken = (request: NextRequest) => {
  const header = request.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return null
  }

  return header.slice(7).trim() || null
}

export const authenticateApiRequest = async (request: NextRequest) => {
  const token = getBearerToken(request)
  if (!token) {
    return { error: jsonError('Missing Bearer API key', 401), apiUser: null as ApiUser | null }
  }

  const { data, error } = await supabaseAdmin
    .from('api_users')
    .select('id,user_id,is_active,usage_count,usage_limit')
    .eq('api_key', token)
    .maybeSingle()

  if (error) {
    return { error: jsonError(error.message, 500), apiUser: null as ApiUser | null }
  }

  const apiUser = data as ApiUser | null
  if (!apiUser) {
    return { error: jsonError('Invalid API key', 401), apiUser: null as ApiUser | null }
  }

  if (!apiUser.is_active) {
    return { error: jsonError('API key is revoked', 403), apiUser: null as ApiUser | null }
  }

  if (Number(apiUser.usage_count || 0) >= Number(apiUser.usage_limit || 0)) {
    return { error: jsonError('API usage limit reached', 429), apiUser: null as ApiUser | null }
  }

  return { error: null, apiUser }
}

export const consumeUsage = async (apiUser: ApiUser) => {
  const { error } = await supabaseAdmin
    .from('api_users')
    .update({ usage_count: Number(apiUser.usage_count || 0) + 1 })
    .eq('id', apiUser.id)

  if (error) {
    return jsonError(error.message, 500)
  }

  return null
}

export const getUserWallet = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('id,balance')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { wallet: null as WalletRow | null, error: jsonError(error.message, 500) }
  }

  if (!data) {
    return { wallet: null as WalletRow | null, error: jsonError('Wallet not found for API user', 404) }
  }

  return { wallet: data as WalletRow, error: null as NextResponse | null }
}

export const debitWallet = async (userId: string, amount: number) => {
  const { data, error } = await supabaseAdmin.rpc('wallet_apply_delta', {
    p_user_id: userId,
    p_delta: -Number(amount || 0),
    p_reason: 'wallet_debit',
    p_reference: generateReference('WLT-DB'),
    p_metadata: { source: 'api' },
  })

  if (error) {
    const status = error.message.toLowerCase().includes('insufficient') ? 402 : 500
    return { walletId: null as string | null, error: jsonError(error.message, status) }
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row?.wallet_id) {
    return { walletId: null as string | null, error: jsonError('Unable to debit wallet', 500) }
  }

  return { walletId: String(row.wallet_id), error: null as NextResponse | null }
}

export const refundWallet = async (walletId: string, amount: number) => {
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('wallets')
    .select('user_id')
    .eq('id', walletId)
    .maybeSingle()

  if (walletError || !wallet?.user_id) {
    return
  }

  await supabaseAdmin.rpc('wallet_apply_delta', {
    p_user_id: wallet.user_id,
    p_delta: Number(amount || 0),
    p_reason: 'wallet_refund',
    p_reference: generateReference('WLT-RF'),
    p_metadata: { source: 'api' },
  })
}

export const createPendingTransaction = async (input: {
  userId: string
  type: TransactionType
  amount: number
  description: string
  reference: string
  metadata?: Record<string, unknown>
}) => {
  const { error } = await supabaseAdmin.from('transactions').insert({
    user_id: input.userId,
    type: input.type,
    amount: input.amount,
    description: input.description,
    status: 'pending',
    reference: input.reference,
    wallet_applied: true,
    metadata: input.metadata || {},
  })

  if (error) {
    return jsonError(error.message, 500)
  }

  return null
}

const getOrderNotificationKindLabel = (kind: OrderNotificationKind) => {
  switch (kind) {
    case 'afa':
      return 'AFA'
    case 'service':
      return 'Service'
    case 'store_data':
      return 'Store Data'
    case 'store_service':
      return 'Store Service'
    case 'store_afa':
      return 'Store AFA'
    default:
      return 'Data'
  }
}

export const notifyAdminsOfNewOrder = async (input: NotifyAdminsOfNewOrderInput) => {
  if (input.customerPhone) {
    try {
      const smsResult = await sendPurchaseProcessingSms({
        phone: input.customerPhone,
        reference: input.reference,
        itemName: input.itemName,
        kind: input.kind,
      })

      if (!smsResult.ok && !smsResult.skipped) {
        console.error('[USMS-GH] Purchase SMS failed:', smsResult.error)
      }
    } catch (error) {
      console.error('[USMS-GH] Purchase SMS error:', error instanceof Error ? error.message : error)
    }
  }

  try {
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('site_settings')
      .select('order_notifications_enabled')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError) {
      throw new Error(settingsError.message)
    }

    if (!settings?.order_notifications_enabled) {
      return
    }

    const { data: admins, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')

    if (adminError) {
      throw new Error(adminError.message)
    }

    const adminIds = ((admins || []) as Array<{ id: string }>).map((admin) => admin.id).filter(Boolean)
    if (adminIds.length === 0) {
      return
    }

    const kindLabel = getOrderNotificationKindLabel(input.kind)
    const sourceLabel =
      input.source === 'dashboard' ? 'Dashboard' : input.source === 'store' ? 'Store' : input.source === 'public' ? 'Public' : 'API'
    const messageParts = [
      `Ref ${input.reference}`,
      `${Number(input.amount || 0).toFixed(2)} GHS`,
      sourceLabel,
      input.storeName || null,
      input.itemName || null,
      input.customerName || null,
      input.customerPhone || null,
    ].filter(Boolean)

    const { error } = await supabaseAdmin.from('notifications').insert(
      adminIds.map((userId) => ({
        user_id: userId,
        title: `New ${kindLabel} order`,
        message: messageParts.join(' | '),
        type: 'info',
        is_read: false,
      }))
    )

    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    console.error('Failed to create admin order notification', error)
  }
}
