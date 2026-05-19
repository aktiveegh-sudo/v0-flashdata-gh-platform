import { NextRequest } from 'next/server'
import {
  authenticateApiRequest,
  createPendingTransaction,
  consumeUsage,
  debitWallet,
  refundWallet,
  generateReference,
  jsonError,
  jsonOk,
  normalizeToGhanaPhone,
  supabaseAdmin,
} from '@/lib/api/rest'

type PurchasePayload = {
  package_id?: string
  phone?: string
}

export async function POST(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const payload = (await request.json().catch(() => ({}))) as PurchasePayload

  if (!payload.package_id) {
    return jsonError('package_id is required', 400)
  }

  if (!payload.phone) {
    return jsonError('phone is required', 400)
  }

  const normalizedPhone = normalizeToGhanaPhone(payload.phone)
  if (!normalizedPhone) {
    return jsonError('phone must be a valid Ghana number', 400)
  }

  const { data: packageRow, error: packageError } = await supabaseAdmin
    .from('data_packages')
    .select('id,network,name,amount,selling_price,is_active')
    .eq('id', payload.package_id)
    .eq('is_active', true)
    .maybeSingle()

  if (packageError) {
    return jsonError(packageError.message, 500)
  }

  if (!packageRow) {
    return jsonError('Invalid package_id or package is inactive', 404)
  }

  const amount = Number(packageRow.selling_price || 0)
  const reference = generateReference(`API-${String(packageRow.network || 'DATA').toUpperCase()}`)

  const { walletId, error: walletError } = await debitWallet(apiUser.user_id, amount)
  if (walletError || !walletId) {
    return walletError
  }

  const { data: created, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      user_id: apiUser.user_id,
      package_id: packageRow.id,
      phone: normalizedPhone,
      amount,
      status: 'pending',
      reference,
      metadata: {
        source: 'developer_api',
      },
    })
    .select('id,status,amount,reference,created_at')
    .single()

  if (orderError) {
    await refundWallet(walletId, amount)
    return jsonError(orderError.message, 500)
  }

  const transactionError = await createPendingTransaction({
    userId: apiUser.user_id,
    type: 'data_purchase',
    amount,
    description: `${packageRow.amount} ${packageRow.network} Data Bundle via API`,
    reference,
    metadata: {
      source: 'developer_api',
      order_id: created.id,
      package_id: packageRow.id,
      phone: normalizedPhone,
    },
  })

  if (transactionError) {
    await supabaseAdmin.from('orders').delete().eq('id', created.id)
    await refundWallet(walletId, amount)
    return transactionError
  }

  return jsonOk(
    {
      order: created,
      package: {
        id: packageRow.id,
        network: packageRow.network,
        name: packageRow.name,
        amount: packageRow.amount,
      },
    },
    201
  )
}
