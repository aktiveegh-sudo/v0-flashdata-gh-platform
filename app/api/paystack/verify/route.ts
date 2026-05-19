import { NextRequest, NextResponse } from 'next/server'
import { fulfillPaystackPayment } from '@/lib/paystack'

export async function GET(request: NextRequest) {
  const reference = new URL(request.url).searchParams.get('reference') || ''

  if (!reference) {
    return NextResponse.json({ success: false, error: 'reference is required' }, { status: 400 })
  }

  try {
    const result = await fulfillPaystackPayment(reference)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to verify payment' },
      { status: 400 }
    )
  }
}