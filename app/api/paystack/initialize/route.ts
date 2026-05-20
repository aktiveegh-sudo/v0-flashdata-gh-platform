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

const getAuthenticatedDashboardUser = async (request: NextRequest) => {
  const supabaseServer = await createSupabaseServerClient()
  const { data: cookieAuth, error: cookieError } = await supabaseServer.auth.getUser()

  if (!cookieError && cookieAuth.user) {
    return cookieAuth.user
  }

  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return null
  }

  const { data: tokenAuth, error: tokenError } = await supabaseAdmin.auth.getUser(token)
  if (tokenError || !tokenAuth.user) {
    return null
  }

  return tokenAuth.user
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as InitializeBody
  const origin = request.headers.get('origin') || new URL(request.url).origin

  if (!body.flow) {
    return jsonError('flow is required', 400)
  }

  try {
    if (body.flow === 'wallet_topup' || body.flow === 'dashboard_data' || body.flow === 'dashboard_afa') {
      const authUser = await getAuthenticatedDashboardUser(request)

      if (!authUser) {
        return jsonError('Please login again', 401)
      }

      const email = authUser.email || ''
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
            userId: authUser.id,
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
            userId: authUser.id,
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
            userId: authUser.id,
          phone: normalizedPhone,
          fullName,
          ghanaCardNumber,
          location,
        },
      })

      return NextResponse.json({ success: true, data: payment })
    }

    if (!body.storeId) {
      return jsonError('storeId is required', 400)
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from('agent_stores')
      .select('id,slug,contact_email,contact_phone')
      .eq('id', body.storeId)
      .eq('is_active', true)
      .maybeSingle()

    if (storeError || !store) {
      return jsonError(storeError?.message || 'Store not found', 404)
    }

    const fallbackEmail = `store-${store.id.slice(0, 8)}@flashdata.gh`
    const customerEmail = (body.customerEmail || store.contact_email || '').trim() || fallbackEmail
    const customerName = (body.customerName || '').trim() || 'Store Customer'
    const customerPhoneFromBody = normalizeToGhanaPhone(body.customerPhone || '')
    const customerPhoneFromStore = normalizeToGhanaPhone(store.contact_phone || '')
    const customerPhone = customerPhoneFromBody || customerPhoneFromStore || (store.contact_phone || '').trim() || 'N/A'

    if (body.flow === 'store_service') {
      if (!body.serviceId) {
        return jsonError('serviceId is required', 400)
      }

      const normalizedServicePhone = normalizeToGhanaPhone(body.phone || '')
      if (!normalizedServicePhone) {
        return jsonError('A valid recipient number is required', 400)
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
          phone: normalizedServicePhone,
          customerName,
          customerPhone: normalizedServicePhone,
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
        customerPhone: normalizedPhone || customerPhone,
        customerEmail,
      },
    })

    return NextResponse.json({ success: true, data: payment })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to initialize Paystack payment', 500)
  }
}