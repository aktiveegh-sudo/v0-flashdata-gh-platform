import { NextRequest } from 'next/server'
import { autoProgressOrders } from '@/lib/orders/auto-progress'
import { jsonError, jsonOk } from '@/lib/api/rest'

export async function POST(_request: NextRequest) {
  try {
    const result = await autoProgressOrders()
    return jsonOk({ autoProgress: result })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'An unknown error occurred', 500)
  }
}
