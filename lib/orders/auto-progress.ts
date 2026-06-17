import { supabaseAdmin } from '@/lib/api/rest'
import { ORDER_AUTO_DELIVERED_AFTER_MS, ORDER_AUTO_PROCESSING_AFTER_MS } from '@/lib/orders/status'

type AutoProgressResult = {
  ordersToProcessing: number
  ordersToDelivered: number
  storeOrdersToProcessing: number
  storeOrdersToDelivered: number
  afaToProcessing: number
  afaToDelivered: number
}

const countRows = (data: unknown) => (Array.isArray(data) ? data.length : 0)

export const autoProgressOrders = async (): Promise<AutoProgressResult> => {
  const now = Date.now()
  const processingThreshold = new Date(now - ORDER_AUTO_PROCESSING_AFTER_MS).toISOString()
  const deliveredThreshold = new Date(now - ORDER_AUTO_DELIVERED_AFTER_MS).toISOString()

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

  return {
    ordersToProcessing: countRows(ordersToProcessing.data),
    ordersToDelivered: countRows(ordersToDelivered.data),
    storeOrdersToProcessing: countRows(storeOrdersToProcessing.data),
    storeOrdersToDelivered: countRows(storeOrdersToDelivered.data),
    afaToProcessing: countRows(afaToProcessing.data),
    afaToDelivered: countRows(afaToDelivered.data),
  }
}
