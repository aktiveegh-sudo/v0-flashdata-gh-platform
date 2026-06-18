import 'server-only'

import { autoProgressOrders } from '@/lib/orders/auto-progress'
import { normalizeToGhanaPhone, supabaseAdmin } from '@/lib/api/rest'

export type TrackedOrder = {
  id: string
  source: 'dashboard' | 'store' | 'public'
  reference: string | null
  phone: string
  status: string
  amount: number
  itemLabel: string
  network: string | null
  createdAt: string
  statusMessage: string
}

const statusMessage = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Payment confirmed — preparing your delivery.'
    case 'processing':
      return 'Your order is being processed.'
    case 'delivered':
      return 'Delivered successfully.'
    case 'failed':
      return 'Order failed — please contact support.'
    case 'declined':
      return 'Order declined — please contact support.'
    case 'rejected':
      return 'Registration rejected — please contact support.'
    default:
      return 'Order status updated.'
  }
}

const extractReferenceFromNote = (note: string | null) => {
  if (!note) return null
  const match = note.match(/Paystack Ref:\s*([^\s|]+)/i)
  return match?.[1]?.trim() || null
}

const phoneSearchTokens = (value: string) => {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  const normalized = normalizeToGhanaPhone(trimmed)
  const local =
    digits.length === 12 && digits.startsWith('233')
      ? `0${digits.slice(3)}`
      : digits.length === 10 && digits.startsWith('0')
        ? digits
        : digits.length === 9
          ? `0${digits}`
          : trimmed

  const lastNine = digits.slice(-9)
  return [...new Set([trimmed, normalized, local, lastNine].filter(Boolean))] as string[]
}

const mapDashboardOrder = (row: {
  id: string
  phone: string
  amount: number | string
  status: string
  reference: string
  created_at: string
  data_packages: { network: string; name: string; amount: string } | null
}): TrackedOrder => ({
  id: row.id,
  source: 'dashboard',
  reference: row.reference,
  phone: row.phone,
  status: row.status,
  amount: Number(row.amount || 0),
  itemLabel: row.data_packages
    ? `${row.data_packages.amount} ${row.data_packages.network} — ${row.data_packages.name}`
    : 'Data bundle',
  network: row.data_packages?.network || null,
  createdAt: row.created_at,
  statusMessage: statusMessage(row.status),
})

const mapStoreOrder = (row: {
  id: string
  customer_phone: string
  total_price: number | string
  status: string
  customer_note: string | null
  created_at: string
  item_type: 'data' | 'service'
  data_packages: { network: string; name: string; amount: string } | null
  online_services: { name: string; category: string } | null
}): TrackedOrder => {
  const reference = extractReferenceFromNote(row.customer_note)
  const isPublic = (row.customer_note || '').toLowerCase().includes('public checkout')

  return {
    id: row.id,
    source: isPublic ? 'public' : 'store',
    reference,
    phone: row.customer_phone,
    status: row.status,
    amount: Number(row.total_price || 0),
    itemLabel:
      row.item_type === 'service'
        ? row.online_services?.name || 'Service order'
        : row.data_packages
          ? `${row.data_packages.amount} ${row.data_packages.network} — ${row.data_packages.name}`
          : 'Data bundle',
    network: row.data_packages?.network || null,
    createdAt: row.created_at,
    statusMessage: statusMessage(row.status),
  }
}

export const trackOrdersLookup = async (input: {
  phone?: string
  reference?: string
}): Promise<TrackedOrder[]> => {
  await autoProgressOrders().catch(() => null)

  const phone = (input.phone || '').trim()
  const reference = (input.reference || '').trim()

  if (!phone && !reference) {
    return []
  }

  const results: TrackedOrder[] = []
  const seen = new Set<string>()

  const pushUnique = (order: TrackedOrder) => {
    const key = `${order.source}:${order.id}`
    if (seen.has(key)) return
    seen.add(key)
    results.push(order)
  }

  if (reference) {
    const { data: dashboardByRef } = await supabaseAdmin
      .from('orders')
      .select('id,phone,amount,status,reference,created_at,data_packages(network,name,amount)')
      .ilike('reference', reference)
      .order('created_at', { ascending: false })
      .limit(5)

    for (const row of dashboardByRef || []) {
      pushUnique(mapDashboardOrder(row))
    }

    const { data: storeByRef } = await supabaseAdmin
      .from('agent_store_orders')
      .select(
        'id,item_type,customer_phone,total_price,status,customer_note,created_at,data_packages(network,name,amount),online_services(name,category)'
      )
      .ilike('customer_note', `%Paystack Ref: ${reference}%`)
      .order('created_at', { ascending: false })
      .limit(5)

    for (const row of storeByRef || []) {
      pushUnique(mapStoreOrder(row))
    }
  }

  if (phone) {
    const tokens = phoneSearchTokens(phone)
    const normalizedPhone = normalizeToGhanaPhone(phone)

    if (normalizedPhone) {
      const { data: dashboardByPhone } = await supabaseAdmin
        .from('orders')
        .select('id,phone,amount,status,reference,created_at,data_packages(network,name,amount)')
        .eq('phone', normalizedPhone)
        .order('created_at', { ascending: false })
        .limit(10)

      for (const row of dashboardByPhone || []) {
        pushUnique(mapDashboardOrder(row))
      }
    }

    const storeFilters = tokens.map((token) => `customer_phone.ilike.%${token}%`).join(',')
    const { data: storeByPhone } = await supabaseAdmin
      .from('agent_store_orders')
      .select(
        'id,item_type,customer_phone,total_price,status,customer_note,created_at,data_packages(network,name,amount),online_services(name,category)'
      )
      .or(storeFilters)
      .order('created_at', { ascending: false })
      .limit(10)

    for (const row of storeByPhone || []) {
      pushUnique(mapStoreOrder(row))
    }
  }

  return results
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
}
