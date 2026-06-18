import { NextRequest } from 'next/server'
import { jsonError, jsonOk } from '@/lib/api/rest'
import { trackOrdersLookup } from '@/lib/orders/track-lookup'

type TrackOrderPayload = {
  phone?: string
  reference?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as TrackOrderPayload
    const phone = (body.phone || '').trim()
    const reference = (body.reference || '').trim()

    if (!phone && !reference) {
      return jsonError('Enter a phone number or payment reference to track your order.', 400)
    }

    const orders = await trackOrdersLookup({ phone, reference })

    return jsonOk({
      orders,
      message:
        orders.length === 0
          ? 'No orders found. If you just paid, wait a minute and try again.'
          : `Found ${orders.length} order${orders.length === 1 ? '' : 's'}.`,
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to track order', 500)
  }
}
