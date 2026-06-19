import { NextRequest } from 'next/server'
import {
  authenticateApiRequest,
  createPendingTransaction,
  consumeUsage,
  debitWallet,
  notifyAdminsOfNewOrder,
  refundWallet,
  generateReference,
  jsonError,
  jsonOk,
  normalizeToGhanaPhone,
  supabaseAdmin,
} from '@/lib/api/rest'
import { fulfillDataOrderDelivery } from '@/lib/data-delivery'

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
    .select('id,network,name,amount,agent_price,selling_price,is_active')
    .eq('id', payload.package_id)
    .eq('is_active', true)
    .maybeSingle()

  if (packageError) {
    return jsonError(packageError.message, 500)
  }

  if (!packageRow) {
    return jsonError('Invalid package_id or package is inactive', 404)
  }

  const amount = Number(packageRow.agent_price || packageRow.selling_price || 0)
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

  const deliveryOutcome = await fulfillDataOrderDelivery({
    orderId: created.id,
    network: packageRow.network,
    packageSize: packageRow.amount,
    phone: normalizedPhone,
    reference,
    idempotencyKey: `api-${reference}`,
    source: 'developer_api',
    existingMetadata: {
      source: 'developer_api',
      package_id: packageRow.id,
      phone: normalizedPhone,
    },
  })

  if (!deliveryOutcome.ok) {
    await supabaseAdmin.from('orders').update({ status: 'failed' }).eq('id', created.id)
    await supabaseAdmin
      .from('transactions')
      .update({
        status: 'failed',
        metadata: {
          source: 'developer_api',
          order_id: created.id,
          package_id: packageRow.id,
          phone: normalizedPhone,
          swift_error: deliveryOutcome.error,
        },
      })
      .eq('reference', reference)
    await refundWallet(walletId, amount)
    return jsonError(deliveryOutcome.error || 'Data delivery failed', 502)
  }

  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'success',
      metadata: {
        source: 'developer_api',
        order_id: created.id,
        package_id: packageRow.id,
        phone: normalizedPhone,
        delivery_provider: deliveryOutcome.provider,
        swift_status: deliveryOutcome.status,
        swift_order_id: deliveryOutcome.orderId,
      },
    })
    .eq('reference', reference)

  await notifyAdminsOfNewOrder({
    kind: 'data',
    reference,
    amount,
    source: 'api',
    customerPhone: normalizedPhone,
  })

  return jsonOk(
    {
      order: {
        ...created,
        status: deliveryOutcome.status === 'completed' || deliveryOutcome.status === 'delivered' ? 'delivered' : 'processing',
      },
      package: {
        id: packageRow.id,
        network: packageRow.network,
        name: packageRow.name,
        amount: packageRow.amount,
      },
      delivery: {
        provider: deliveryOutcome.provider,
        status: deliveryOutcome.status,
        orderId: deliveryOutcome.orderId,
      },
    },
    201
  )
}
