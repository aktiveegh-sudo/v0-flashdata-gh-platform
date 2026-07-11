import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'
import { ORDER_AUTO_DELIVERED_AFTER_MS, ORDER_AUTO_PROCESSING_AFTER_MS } from '@/lib/orders/status'
import { maybeSendOrderStatusSms } from '@/lib/sms/order-status'

type AutoProgressResult = {
  ordersToProcessing: number
  ordersToDelivered: number
  storeOrdersToProcessing: number
  storeOrdersToDelivered: number
  afaToProcessing: number
  afaToDelivered: number
}

const countRows = (data: unknown) => (Array.isArray(data) ? data.length : 0)

const sendCompletedSmsForDashboardOrders = async (orderIds: string[]) => {
  if (orderIds.length === 0) return

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id,phone,reference,data_packages(name,amount,network)')
    .in('id', orderIds)

  if (error || !data) {
    console.error('[SMS] Unable to load dashboard orders for completion SMS:', error?.message)
    return
  }

  await Promise.all(
    data.map(async (row) => {
      const packageRow = Array.isArray(row.data_packages) ? row.data_packages[0] : row.data_packages
      const network = String(packageRow?.network || '').trim().toUpperCase()

      await maybeSendOrderStatusSms({
        phone: row.phone,
        reference: row.reference,
        itemName: packageRow ? `${packageRow.amount} ${packageRow.network}` : null,
        kind: network === 'AFA' ? 'afa' : 'data',
        source: 'dashboard',
        status: 'delivered',
      })
    })
  )
}

const sendCompletedSmsForPublicStoreOrders = async (orderIds: string[]) => {
  if (orderIds.length === 0) return

  const { data, error } = await supabaseAdmin
    .from('agent_store_orders')
    .select('id,customer_phone,customer_note,item_type,data_packages(name,amount,network),online_services(name,category)')
    .in('id', orderIds)

  if (error || !data) {
    console.error('[SMS] Unable to load public store orders for completion SMS:', error?.message)
    return
  }

  await Promise.all(
    data.map(async (row) => {
      const note = row.customer_note || ''
      if (!note.toLowerCase().includes('source: public checkout')) {
        return
      }

      const packageRow = Array.isArray(row.data_packages) ? row.data_packages[0] : row.data_packages
      const serviceRow = Array.isArray(row.online_services) ? row.online_services[0] : row.online_services
      const referenceMatch = note.match(/Paystack Ref:\s*([^\s|]+)/i)
      const reference = referenceMatch?.[1]?.trim() || null
      const kind =
        row.item_type === 'service'
          ? 'service'
          : String(packageRow?.network || '').trim().toUpperCase() === 'AFA'
            ? 'afa'
            : 'data'
      const itemName =
        row.item_type === 'service'
          ? serviceRow?.name || 'Service'
          : packageRow
            ? `${packageRow.amount} ${packageRow.network}`
            : 'Data bundle'

      await maybeSendOrderStatusSms({
        phone: row.customer_phone,
        reference,
        itemName,
        kind,
        source: 'public',
        status: 'delivered',
      })
    })
  )
}

export const autoProgressOrders = async (): Promise<AutoProgressResult> => {
  const now = Date.now()
  const processingThreshold = new Date(now - ORDER_AUTO_PROCESSING_AFTER_MS).toISOString()
  const deliveredThreshold = new Date(now - ORDER_AUTO_DELIVERED_AFTER_MS).toISOString()

  const { data: dashboardOrdersToDeliver } = await supabaseAdmin
    .from('orders')
    .select('id')
    .in('status', ['pending', 'processing'])
    .eq('status_locked', false)
    .lte('created_at', deliveredThreshold)

  const { data: publicStoreOrdersToDeliver } = await supabaseAdmin
    .from('agent_store_orders')
    .select('id,customer_note')
    .in('status', ['pending', 'processing'])
    .eq('status_locked', false)
    .lte('created_at', deliveredThreshold)

  const dashboardDeliverIds = (dashboardOrdersToDeliver || []).map((row) => row.id)
  const publicStoreDeliverIds = (publicStoreOrdersToDeliver || [])
    .filter((row) => (row.customer_note || '').toLowerCase().includes('source: public checkout'))
    .map((row) => row.id)

  const [
    ordersToProcessing,
    ordersToDelivered,
    storeOrdersToProcessing,
    storeOrdersToDelivered,
    afaToProcessing,
    afaToDelivered,
  ] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .update({ status: 'processing' })
      .eq('status', 'pending')
      .eq('status_locked', false)
      .lte('created_at', processingThreshold)
      .gt('created_at', deliveredThreshold)
      .select('id'),
    supabaseAdmin
      .from('orders')
      .update({ status: 'delivered' })
      .in('status', ['pending', 'processing'])
      .eq('status_locked', false)
      .lte('created_at', deliveredThreshold)
      .select('id'),
    supabaseAdmin
      .from('agent_store_orders')
      .update({ status: 'processing' })
      .eq('status', 'pending')
      .eq('status_locked', false)
      .lte('created_at', processingThreshold)
      .gt('created_at', deliveredThreshold)
      .select('id'),
    supabaseAdmin
      .from('agent_store_orders')
      .update({ status: 'delivered' })
      .in('status', ['pending', 'processing'])
      .eq('status_locked', false)
      .lte('created_at', deliveredThreshold)
      .select('id'),
    supabaseAdmin
      .from('afa_registrations')
      .update({ status: 'processing' })
      .eq('status', 'pending')
      .eq('status_locked', false)
      .lte('created_at', processingThreshold)
      .gt('created_at', deliveredThreshold)
      .select('id'),
    supabaseAdmin
      .from('afa_registrations')
      .update({ status: 'delivered' })
      .in('status', ['pending', 'processing'])
      .eq('status_locked', false)
      .lte('created_at', deliveredThreshold)
      .select('id'),
  ])

  const errors = [
    ordersToProcessing.error,
    ordersToDelivered.error,
    storeOrdersToProcessing.error,
    storeOrdersToDelivered.error,
    afaToProcessing.error,
    afaToDelivered.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    throw new Error((errors[0] as { message?: string }).message || 'Failed to auto-progress orders')
  }

  await Promise.all([
    sendCompletedSmsForDashboardOrders(dashboardDeliverIds),
    sendCompletedSmsForPublicStoreOrders(publicStoreDeliverIds),
  ])

  return {
    ordersToProcessing: countRows(ordersToProcessing.data),
    ordersToDelivered: countRows(ordersToDelivered.data),
    storeOrdersToProcessing: countRows(storeOrdersToProcessing.data),
    storeOrdersToDelivered: countRows(storeOrdersToDelivered.data),
    afaToProcessing: countRows(afaToProcessing.data),
    afaToDelivered: countRows(afaToDelivered.data),
  }
}
