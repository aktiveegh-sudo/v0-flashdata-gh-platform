import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateReference, normalizeToGhanaPhone, notifyAdminsOfNewOrder, supabaseAdmin } from '@/lib/api/rest'

type PurchaseBody = {
  flow?: 'data' | 'afa' | 'service'
  packageId?: string
  serviceId?: string
  phone?: string
  fullName?: string
  ghanaCardNumber?: string
  location?: string
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

const applyWalletDelta = async (userId: string, delta: number, reason: string, reference: string, metadata: Record<string, unknown>) => {
  const { data, error } = await supabaseAdmin.rpc('wallet_apply_delta', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
    p_reference: reference,
    p_metadata: metadata,
  })

  if (error) {
    return { error: error.message, wallet: null as { wallet_id: string; balance_after: number } | null }
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row || !row.wallet_id) {
    return { error: 'Unable to update wallet', wallet: null as { wallet_id: string; balance_after: number } | null }
  }

  return {
    error: null as string | null,
    wallet: {
      wallet_id: String(row.wallet_id),
      balance_after: Number(row.balance_after || 0),
    },
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as PurchaseBody
  const flow = body.flow || 'data'

  try {
    const authUser = await getAuthenticatedDashboardUser(request)
    if (!authUser) {
      return jsonError('Please login again', 401)
    }

    if (flow === 'afa') {
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
        .select('base_price,agent_price,is_active')
        .eq('id', 1)
        .maybeSingle()

      if (settingsError || !settings?.is_active) {
        return jsonError(settingsError?.message || 'AFA registration is unavailable', 403)
      }

      const amount = Number(settings.agent_price || settings.base_price || 0)
      const reference = generateReference('AFA-WAL')

      const walletResult = await applyWalletDelta(
        authUser.id,
        -amount,
        'AFA registration purchase',
        reference,
        { source: 'dashboard_wallet', flow: 'afa', phone: normalizedPhone }
      )

      if (walletResult.error) {
        return jsonError(walletResult.error.includes('Insufficient') ? walletResult.error : `Wallet error: ${walletResult.error}`, walletResult.error.includes('Insufficient') ? 402 : 500)
      }

      const { data: createdRegistration, error: registrationError } = await supabaseAdmin
        .from('afa_registrations')
        .insert({
          user_id: authUser.id,
          full_name: fullName,
          phone: normalizedPhone,
          ghana_card_number: ghanaCardNumber,
          location,
          amount,
          reference,
          status: 'pending',
        })
        .select('id')
        .single()

      if (registrationError) {
        await applyWalletDelta(authUser.id, amount, 'AFA registration refund', `${reference}-RFND`, {
          source: 'dashboard_wallet',
          flow: 'afa',
          reason: 'registration_insert_failed',
        })
        return jsonError(registrationError.message, 500)
      }

      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        user_id: authUser.id,
        type: 'online_service',
        amount,
        status: 'success',
        description: 'AFA Registration via Wallet',
        reference,
        wallet_applied: true,
        metadata: {
          source: 'dashboard_wallet',
          flow: 'afa',
          registration_id: createdRegistration.id,
          phone: normalizedPhone,
        },
      })

      if (txError) {
        return jsonError(txError.message, 500)
      }

      void notifyAdminsOfNewOrder({
        kind: 'afa',
        reference,
        amount,
        source: 'dashboard',
        customerName: fullName,
        customerPhone: normalizedPhone,
      })

      return NextResponse.json({
        success: true,
        data: {
          reference,
          amount,
          balanceAfter: walletResult.wallet?.balance_after || 0,
          redirectPath: '/dashboard/afa',
        },
      })
    }

    if (flow === 'service') {
      const normalizedPhone = normalizeToGhanaPhone(body.phone || '')
      if (!body.serviceId || !normalizedPhone) {
        return jsonError('serviceId and a valid phone number are required', 400)
      }

      const { data: serviceRow, error: serviceError } = await supabaseAdmin
        .from('online_services')
        .select('id,name,category,agent_price,price,is_active')
        .eq('id', body.serviceId)
        .eq('is_active', true)
        .maybeSingle()

      if (serviceError || !serviceRow) {
        return jsonError(serviceError?.message || 'Service not found', 404)
      }

      const amount = Number(serviceRow.agent_price || serviceRow.price || 0)
      const reference = generateReference('SVC-WAL')

      const walletResult = await applyWalletDelta(
        authUser.id,
        -amount,
        'Service purchase',
        reference,
        { source: 'dashboard_wallet', flow: 'service', service_id: serviceRow.id, phone: normalizedPhone }
      )

      if (walletResult.error) {
        return jsonError(walletResult.error.includes('Insufficient') ? walletResult.error : `Wallet error: ${walletResult.error}`, walletResult.error.includes('Insufficient') ? 402 : 500)
      }

      const [{ data: platformStore }, { data: profile }] = await Promise.all([
        supabaseAdmin
          .from('agent_stores')
          .select('id,agent_id,slug,brand_name')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('profiles')
          .select('full_name,phone')
          .eq('id', authUser.id)
          .maybeSingle(),
      ])

      const customerName = (profile?.full_name || authUser.email || 'Dashboard User').trim()
      const customerNote = [
        `Wallet Ref: ${reference}`,
        'Source: dashboard wallet',
        `Recipient: ${normalizedPhone}`,
        `Service: ${serviceRow.name}`,
      ].join(' | ')

      if (platformStore) {
        const { error: storeOrderError } = await supabaseAdmin.from('agent_store_orders').insert({
          store_id: platformStore.id,
          item_type: 'service',
          service_id: serviceRow.id,
          customer_name: customerName,
          customer_phone: normalizedPhone,
          customer_email: authUser.email || '',
          customer_note: customerNote,
          quantity: 1,
          total_price: amount,
          status: 'pending',
        })

        if (storeOrderError) {
          await applyWalletDelta(authUser.id, amount, 'Service purchase refund', `${reference}-RFND`, {
            source: 'dashboard_wallet',
            flow: 'service',
            reason: 'store_order_insert_failed',
          })
          return jsonError(storeOrderError.message, 500)
        }
      }

      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        user_id: authUser.id,
        type: 'online_service',
        amount,
        status: 'success',
        description: `${serviceRow.name} via Wallet`,
        reference,
        wallet_applied: true,
        metadata: {
          source: 'dashboard_wallet',
          flow: 'service',
          service_id: serviceRow.id,
          phone: normalizedPhone,
        },
      })

      if (txError) {
        return jsonError(txError.message, 500)
      }

      void notifyAdminsOfNewOrder({
        kind: 'service',
        reference,
        amount,
        source: 'dashboard',
        customerName,
        customerPhone: normalizedPhone,
        itemName: serviceRow.name,
      })

      return NextResponse.json({
        success: true,
        data: {
          reference,
          amount,
          balanceAfter: walletResult.wallet?.balance_after || 0,
          redirectPath: '/dashboard/buy-services',
        },
      })
    }

    const normalizedPhone = normalizeToGhanaPhone(body.phone || '')
    if (!body.packageId || !normalizedPhone) {
      return jsonError('packageId and a valid phone number are required', 400)
    }

    const { data: packageRow, error: packageError } = await supabaseAdmin
      .from('data_packages')
      .select('id,network,name,amount,agent_price,selling_price,is_active')
      .eq('id', body.packageId)
      .eq('is_active', true)
      .maybeSingle()

    if (packageError || !packageRow) {
      return jsonError(packageError?.message || 'Data package not found', 404)
    }

    const isAfa = String(packageRow.network || '').trim().toUpperCase() === 'AFA'
    if (isAfa) {
      return jsonError('Use AFA flow for AFA registrations', 400)
    }

    const amount = Number(packageRow.agent_price || packageRow.selling_price || 0)
    const reference = generateReference(`WAL-${String(packageRow.network || 'DATA').toUpperCase()}`)

    const walletResult = await applyWalletDelta(
      authUser.id,
      -amount,
      'Data purchase',
      reference,
      { source: 'dashboard_wallet', flow: 'data', package_id: packageRow.id, phone: normalizedPhone }
    )

    if (walletResult.error) {
      return jsonError(walletResult.error.includes('Insufficient') ? walletResult.error : `Wallet error: ${walletResult.error}`, walletResult.error.includes('Insufficient') ? 402 : 500)
    }

    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: authUser.id,
        package_id: packageRow.id,
        phone: normalizedPhone,
        amount,
        status: 'pending',
        reference,
        metadata: {
          source: 'dashboard_wallet',
        },
      })
      .select('id')
      .single()

    if (orderError) {
      await applyWalletDelta(authUser.id, amount, 'Data purchase refund', `${reference}-RFND`, {
        source: 'dashboard_wallet',
        flow: 'data',
        reason: 'order_insert_failed',
      })
      return jsonError(orderError.message, 500)
    }

    const { error: txError } = await supabaseAdmin.from('transactions').insert({
      user_id: authUser.id,
      type: 'data_purchase',
      amount,
      status: 'success',
      description: `${packageRow.amount} ${packageRow.network} Data Bundle via Wallet`,
      reference,
      wallet_applied: true,
      metadata: {
        source: 'dashboard_wallet',
        flow: 'data',
        package_id: packageRow.id,
        phone: normalizedPhone,
        order_id: createdOrder.id,
      },
    })

    if (txError) {
      return jsonError(txError.message, 500)
    }

    void notifyAdminsOfNewOrder({
      kind: 'data',
      reference,
      amount,
      source: 'dashboard',
      customerPhone: normalizedPhone,
      itemName: packageRow.name,
    })

    return NextResponse.json({
      success: true,
      data: {
        reference,
        amount,
        balanceAfter: walletResult.wallet?.balance_after || 0,
        redirectPath: '/dashboard/buy-data',
      },
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to process wallet purchase', 500)
  }
}
