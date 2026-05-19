import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
  const { wallet, error } = await getUserWallet(userId)
  if (error || !wallet) {
    return { walletId: null as string | null, error }
  }

  const currentBalance = Number(wallet.balance || 0)
  if (currentBalance < amount) {
    return { walletId: null as string | null, error: jsonError('Insufficient wallet balance', 402) }
  }

  const nextBalance = Number((currentBalance - amount).toFixed(2))

  const { error: updateError } = await supabaseAdmin
    .from('wallets')
    .update({
      balance: nextBalance,
      last_updated: new Date().toISOString(),
    })
    .eq('id', wallet.id)

  if (updateError) {
    return { walletId: null as string | null, error: jsonError(updateError.message, 500) }
  }

  return { walletId: wallet.id, error: null as NextResponse | null }
}

export const refundWallet = async (walletId: string, amount: number) => {
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('wallets')
    .select('id,balance')
    .eq('id', walletId)
    .maybeSingle()

  if (walletError || !wallet) {
    return
  }

  const nextBalance = Number((Number(wallet.balance || 0) + amount).toFixed(2))

  await supabaseAdmin
    .from('wallets')
    .update({
      balance: nextBalance,
      last_updated: new Date().toISOString(),
    })
    .eq('id', walletId)
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
