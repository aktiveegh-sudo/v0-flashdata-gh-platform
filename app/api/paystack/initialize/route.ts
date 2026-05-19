import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { initializePaystackTransaction, PaystackFlow } from '@/lib/paystack'
import { normalizeToGhanaPhone, supabaseAdmin } from '@/lib/api/rest'

type InitializeBody = {
  flow: PaystackFlow
  amount?: number
  packageId?: string
  serviceId?: string
  phone?: string
  fullName?: string
  ghanaCardNumber?: string
  location?: string
  storeId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  paymentMethod?: string
  redirectPath?: string
}

const jsonError = (message: string, status = 400) => NextResponse.json({ success: false, error: message }, { status })

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as InitializeBody
  const origin = request.headers.get('origin') || new URL(request.url).origin

  if (!body.flow) {
    return jsonError('flow is required', 400)
  }

  try {
    if (body.flow === 'wallet_topup' || body.flow === 'dashboard_data' || body.flow === 'dashboard_afa') {
      const supabaseServer = await createSupabaseServerClient()
      const { data: authData, error: authError } = await supabaseServer.auth.getUser()

      if (authError || !authData.user) {
        return jsonError('Please login again', 401)
      }

      const email = authData.user.email || ''
      if (!email) {
        return jsonError('Authenticated user must have an email address', 400)
      }

      if (body.flow === 'wallet_topup') {
        const amount = Number(body.amount || 0)
        if (!Number.isFinite(amount) || amount <= 0) {
          return jsonError('A valid amount is required', 400)
        }

        const payment = await initializePaystackTransaction({
          email,
          amount,
          callbackUrl: `${origin}/payments/callback?next=${encodeURIComponent(body.redirectPath || '/dashboard/wallet')}`,
          metadata: {
            flow: body.flow,
            redirectPath: body.redirectPath || '/dashboard/wallet',
            userId: authData.user.id,
            paymentMethod: body.paymentMethod || '',
          },
          channels: body.paymentMethod === 'card' ? ['card'] : ['mobile_money', 'card'],
        })

        return NextResponse.json({ success: true, data: payment })
      }

      if (body.flow === 'dashboard_data') {
        const normalizedPhone = normalizeToGhanaPhone(body.phone || '')
        if (!body.packageId || !normalizedPhone) {
          return jsonError('packageId and a valid phone number are required', 400)
        }

        const { data: packageRow, error: packageError } = await supabaseAdmin
          .from('data_packages')
          .select('id,selling_price,is_active')
          .eq('id', body.packageId)
          .eq('is_active', true)
          .maybeSingle()

        if (packageError || !packageRow) {
          return jsonError(packageError?.message || 'Data package not found', 404)
        }

        const payment = await initializePaystackTransaction({
          email,
          amount: Number(packageRow.selling_price || 0),
          callbackUrl: `${origin}/payments/callback?next=${encodeURIComponent(body.redirectPath || '/dashboard/buy-data')}`,
          metadata: {
            flow: body.flow,
            redirectPath: body.redirectPath || '/dashboard/buy-data',
            userId: authData.user.id,
            packageId: packageRow.id,
            phone: normalizedPhone,
          },
        })

        return NextResponse.json({ success: true, data: payment })
      }

      const normalizedPhone = normalizeToGhanaPhone(body.phone || '')
      const fullName = (body.fullName || '').trim()
      const location = (body.location || '').trim()
      const ghanaCardNumber = (body.ghanaCardNumber || '').trim().toUpperCase()
      const ghanaCardPattern = /^GHA-\d{9}-\d$/i

      if (!normalizedPhone || !fullName || !location || !ghanaCardPattern.test(ghanaCardNumber)) {
        return jsonError('Valid phone, fullName, location, and Ghana Card number are required', 400)
      }

      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('afa_settings')
        .select('base_price,is_active')
        .eq('id', 1)
        .maybeSingle()

      if (settingsError || !settings?.is_active) {
        return jsonError(settingsError?.message || 'AFA registration is unavailable', 403)
      }

      const payment = await initializePaystackTransaction({
        email,
        amount: Number(settings.base_price || 0),
        callbackUrl: `${origin}/payments/callback?next=${encodeURIComponent(body.redirectPath || '/dashboard/afa')}`,
        metadata: {
          flow: body.flow,
          redirectPath: body.redirectPath || '/dashboard/afa',
          userId: authData.user.id,
          phone: normalizedPhone,
          fullName,
          ghanaCardNumber,
          location,
        },
      })

      return NextResponse.json({ success: true, data: payment })
    }

    const customerEmail = (body.customerEmail || '').trim()
    const customerName = (body.customerName || '').trim()
    const customerPhone = (body.customerPhone || '').trim()

    if (!body.storeId || !customerEmail || !customerName || !customerPhone) {
      return jsonError('storeId, customerName, customerPhone, and customerEmail are required', 400)
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from('agent_stores')
      .select('id,slug')
      .eq('id', body.storeId)
      .eq('is_active', true)
      .maybeSingle()

    if (storeError || !store) {
      return jsonError(storeError?.message || 'Store not found', 404)
    }

    if (body.flow === 'store_service') {
      if (!body.serviceId) {
        return jsonError('serviceId is required', 400)
      }

      const { data: serviceRow, error: serviceError } = await supabaseAdmin
        .from('agent_store_service_prices')
        .select('service_id,selling_price')
        .eq('store_id', store.id)
        .eq('service_id', body.serviceId)
        .eq('is_active', true)
        .maybeSingle()

      if (serviceError || !serviceRow) {
        return jsonError(serviceError?.message || 'Store service not found', 404)
      }

      const payment = await initializePaystackTransaction({
        email: customerEmail,
        amount: Number(serviceRow.selling_price || 0),
        callbackUrl: `${origin}/payments/callback?next=${encodeURIComponent(body.redirectPath || `/store/${store.slug}`)}`,
        metadata: {
          flow: body.flow,
          redirectPath: body.redirectPath || `/store/${store.slug}`,
          storeId: store.id,
          serviceId: serviceRow.service_id,
          customerName,
          customerPhone,
          customerEmail,
        },
      })

      return NextResponse.json({ success: true, data: payment })
    }

    const normalizedPhone = normalizeToGhanaPhone(body.phone || '')
    if (!body.packageId || !normalizedPhone) {
      return jsonError('packageId and a valid phone number are required', 400)
    }

    const { data: packageRow, error: packageError } = await supabaseAdmin
      .from('agent_store_packages')
      .select('data_package_id,selling_price,data_packages!inner(network)')
      .eq('store_id', store.id)
      .eq('data_package_id', body.packageId)
      .eq('is_active', true)
      .maybeSingle()

    if (packageError || !packageRow) {
      return jsonError(packageError?.message || 'Store package not found', 404)
    }

    const isStoreAfa = String(packageRow.data_packages?.network || '').trim().toUpperCase() === 'AFA'
    let fullName = ''
    let ghanaCardNumber = ''
    let location = ''

    if (body.flow === 'store_afa' || isStoreAfa) {
      fullName = (body.fullName || '').trim()
      ghanaCardNumber = (body.ghanaCardNumber || '').trim().toUpperCase()
      location = (body.location || '').trim()
      const ghanaCardPattern = /^GHA-\d{9}-\d$/i

      if (!fullName || !location || !ghanaCardPattern.test(ghanaCardNumber)) {
        return jsonError('Valid fullName, location, and Ghana Card number are required', 400)
      }
    }

    const payment = await initializePaystackTransaction({
      email: customerEmail,
      amount: Number(packageRow.selling_price || 0),
      callbackUrl: `${origin}/payments/callback?next=${encodeURIComponent(body.redirectPath || `/store/${store.slug}`)}`,
      metadata: {
        flow: body.flow === 'store_afa' || isStoreAfa ? 'store_afa' : 'store_data',
        redirectPath: body.redirectPath || `/store/${store.slug}`,
        storeId: store.id,
        packageId: packageRow.data_package_id,
        phone: normalizedPhone,
        fullName,
        ghanaCardNumber,
        location,
        customerName,
        customerPhone,
        customerEmail,
      },
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to initialize Paystack payment', 500)
  }
}