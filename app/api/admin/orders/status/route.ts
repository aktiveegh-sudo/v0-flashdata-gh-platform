import { NextRequest } from 'next/server'
import { assertAdminRequest } from '@/lib/admin/auth'
import { jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'
import { adminStatusOptions, type AdminOrderSource } from '@/lib/orders/status'
import {
  fetchDashboardOrderSmsContext,
  fetchStoreOrderSmsContext,
  maybeSendOrderStatusSms,
} from '@/lib/sms/order-status'

type StatusUpdateBody = {
  source?: AdminOrderSource
  orderId?: string
  status?: string
}

const getTableForSource = (source: AdminOrderSource) => {
  if (source === 'dashboard') {
    return 'orders' as const
  }

  if (source === 'dashboard_afa') {
    return 'afa_registrations' as const
  }

  return 'agent_store_orders' as const
}

export async function PATCH(request: NextRequest) {
  const { response } = await assertAdminRequest(request)
  if (response) {
    return response
  }

  try {
    const body = (await request.json()) as StatusUpdateBody
    const source = body.source
    const orderId = String(body.orderId || '').trim()
    const status = String(body.status || '').trim().toLowerCase()

    if (!source || !orderId || !status) {
      return jsonError('source, orderId, and status are required', 400)
    }

    const allowedStatuses = adminStatusOptions[source]
    if (!allowedStatuses?.includes(status)) {
      return jsonError(`Invalid status "${status}" for ${source}`, 400)
    }

    const table = getTableForSource(source)
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ status, status_locked: true })
      .eq('id', orderId)
      .select('id,status,status_locked,updated_at')
      .maybeSingle()

    if (error) {
      return jsonError(error.message, 500)
    }

    if (!data) {
      return jsonError('Order not found', 404)
    }

    if (status === 'delivered') {
      const smsContext =
        source === 'dashboard'
          ? await fetchDashboardOrderSmsContext(orderId)
          : source === 'store_data' || source === 'store_service' || source === 'store_afa'
            ? await fetchStoreOrderSmsContext(orderId)
            : null

      if (smsContext) {
        await maybeSendOrderStatusSms({
          phone: smsContext.phone,
          reference: smsContext.reference,
          itemName: smsContext.itemName,
          kind: smsContext.kind,
          source: smsContext.source,
          status: 'delivered',
        }).catch((error) => {
          console.error('[SMS] Admin delivered status SMS failed:', error instanceof Error ? error.message : error)
        })
      }
    }

    return jsonOk({ order: data })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to update order status', 500)
  }
}
