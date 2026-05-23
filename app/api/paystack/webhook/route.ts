import { NextRequest, NextResponse } from 'next/server'
import { fulfillPaystackPayment, verifyPaystackSignature } from '@/lib/paystack'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!(await verifyPaystackSignature(rawBody, signature))) {
    return NextResponse.json({ success: false, error: 'Invalid Paystack signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as { event?: string; data?: { status?: string; reference?: string } }

  if (payload.event !== 'charge.success' || payload.data?.status !== 'success' || !payload.data.reference) {
    return NextResponse.json({ success: true })
  }

  try {
    await fulfillPaystackPayment(payload.data.reference)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 400 })
  }
}