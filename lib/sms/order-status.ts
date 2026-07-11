import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'
import { sendPurchaseCompletedSms, shouldSendCustomerOrderSms } from '@/lib/sms/usmsgh'

type OrderStatusSmsInput = {
  phone?: string | null
  reference?: string | null
  itemName?: string | null
  kind?: 'data' | 'afa' | 'service' | 'store_data' | 'store_service' | 'store_afa'
  source: string
  status: 'processing' | 'delivered'
}

export const maybeSendOrderStatusSms = async (input: OrderStatusSmsInput) => {
  if (!shouldSendCustomerOrderSms(input.source)) {
    return { ok: false, skipped: true as const }
  }

  const phone = (input.phone || '').trim()
  const reference = (input.reference || '').trim()
  if (!phone || !reference) {
    return { ok: false, skipped: true as const, error: 'Missing phone or reference for SMS' }
  }

  if (input.status === 'delivered') {
    return sendPurchaseCompletedSms({
      phone,
      reference,
      itemName: input.itemName,
      kind: input.kind || 'data',
    })
  }

  return { ok: false, skipped: true as const }
}

export const isPublicStoreOrderNote = (note: string | null | undefined) =>
  (note || '').toLowerCase().includes('source: public checkout')

export const extractReferenceFromStoreNote = (note: string | null | undefined) => {
  if (!note) return null
  const match = note.match(/Paystack Ref:\s*([^\s|]+)/i)
  return match?.[1]?.trim() || null
}

export const fetchDashboardOrderSmsContext = async (orderId: string) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('phone,reference,status,data_packages(name,amount,network)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const packageRow = Array.isArray(data.data_packages) ? data.data_packages[0] : data.data_packages
  const network = String(packageRow?.network || '').trim().toUpperCase()
  const kind = network === 'AFA' ? 'afa' : 'data'

  return {
    phone: data.phone,
    reference: data.reference,
    itemName: packageRow ? `${packageRow.amount} ${packageRow.network}` : null,
    kind: kind as 'data' | 'afa',
    source: 'dashboard' as const,
    status: data.status,
  }
}

export const fetchStoreOrderSmsContext = async (orderId: string) => {
  const { data, error } = await supabaseAdmin
    .from('agent_store_orders')
    .select(
      'customer_phone,customer_note,status,item_type,data_packages(name,amount,network),online_services(name,category)'
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data || !isPublicStoreOrderNote(data.customer_note)) {
    return null
  }

  const packageRow = Array.isArray(data.data_packages) ? data.data_packages[0] : data.data_packages
  const serviceRow = Array.isArray(data.online_services) ? data.online_services[0] : data.online_services

  const kind =
    data.item_type === 'service'
      ? 'service'
      : String(packageRow?.network || '').trim().toUpperCase() === 'AFA'
        ? 'afa'
        : 'data'

  const itemName =
    data.item_type === 'service'
      ? serviceRow?.name || 'Service'
      : packageRow
        ? `${packageRow.amount} ${packageRow.network}`
        : 'Data bundle'

  return {
    phone: data.customer_phone,
    reference: extractReferenceFromStoreNote(data.customer_note),
    itemName,
    kind: kind as 'data' | 'afa' | 'service',
    source: 'public' as const,
    status: data.status,
  }
}
