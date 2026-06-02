import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, jsonError, jsonOk } from '@/lib/api/rest'

export async function POST(request: NextRequest) {
  try {
    const threshold = new Date(Date.now() - 13 * 60 * 1000).toISOString()

    const [ordersUpdate, storeOrdersUpdate, afaUpdate] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .update({ status: 'success' })
        .in('status', ['pending'])
        .lt('created_at', threshold),
      supabaseAdmin
        .from('agent_store_orders')
        .update({ status: 'completed' })
        .in('status', ['pending', 'accepted'])
        .lt('created_at', threshold),
      supabaseAdmin
        .from('afa_registrations')
        .update({ status: 'completed' })
        .in('status', ['pending', 'processing'])
        .lt('created_at', threshold),
    ])

    const errors = [ordersUpdate.error, storeOrdersUpdate.error, afaUpdate.error].filter(Boolean)
    if (errors.length > 0) {
      return jsonError((errors[0] as Error).message || 'Failed to auto-complete old orders', 500)
    }

    return jsonOk({
      completedOldOrders: {
        orders: ordersUpdate.data?.length ?? 0,
        storeOrders: storeOrdersUpdate.data?.length ?? 0,
        afaRegistrations: afaUpdate.data?.length ?? 0,
      },
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'An unknown error occurred', 500)
  }
}
