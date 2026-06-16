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

type AfaPayload = {
  full_name?: string
  phone?: string
  ghana_card_number?: string
  location?: string
}

export async function POST(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const payload = (await request.json().catch(() => ({}))) as AfaPayload

  const fullName = (payload.full_name || '').trim()
  const location = (payload.location || '').trim()
  const ghanaCard = (payload.ghana_card_number || '').trim().toUpperCase()
  const normalizedPhone = normalizeToGhanaPhone(payload.phone || '')

  if (!fullName) return jsonError('full_name is required', 400)
  if (!normalizedPhone) return jsonError('phone must be a valid Ghana number', 400)
  if (!location) return jsonError('location is required', 400)

  const ghanaCardPattern = /^GHA-\d{9}-\d$/i
  if (!ghanaCardPattern.test(ghanaCard)) {
    return jsonError('ghana_card_number must match format GHA-123456789-1', 400)
  }

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('afa_settings')
    .select('base_price,is_active')
    .eq('id', 1)
    .maybeSingle()

  if (settingsError) {
    return jsonError(settingsError.message, 500)
  }

  if (!settings?.is_active) {
    return jsonError('AFA registration is currently disabled', 403)
  }

  const amount = Number(settings.base_price || 0)
  const reference = generateReference('AFA-API')

  const { walletId, error: walletError } = await debitWallet(apiUser.user_id, amount)
  if (walletError || !walletId) {
    return walletError
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from('afa_registrations')
    .insert({
      user_id: apiUser.user_id,
      full_name: fullName,
      phone: normalizedPhone,
      ghana_card_number: ghanaCard,
      location,
      amount,
      reference,
      status: 'pending',
    })
    .select('id,status,amount,reference,created_at')
    .single()

  if (insertError) {
    await refundWallet(walletId, amount)
    return jsonError(insertError.message, 500)
  }

  const transactionError = await createPendingTransaction({
    userId: apiUser.user_id,
    type: 'online_service',
    amount,
    description: 'AFA Registration via API',
    reference,
    metadata: {
      source: 'developer_api',
      registration_id: created.id,
      full_name: fullName,
      phone: normalizedPhone,
      ghana_card_number: ghanaCard,
      location,
    },
  })

  if (transactionError) {
    await supabaseAdmin.from('afa_registrations').delete().eq('id', created.id)
    await refundWallet(walletId, amount)
    return transactionError
  }

  await notifyAdminsOfNewOrder({
    kind: 'afa',
    reference,
    amount,
    source: 'api',
    customerName: fullName,
    customerPhone: normalizedPhone,
  })

  return jsonOk({ registration: created }, 201)
}
