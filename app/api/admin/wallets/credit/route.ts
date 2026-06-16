import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { generateReference, supabaseAdmin } from '@/lib/api/rest'

type CreditBody = {
  userId?: string
  amount?: number
  note?: string
}

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ success: false, error: message }, { status })

const getRequestUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

  if (bearer) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer)
    if (!error && data.user) {
      return data.user
    }
  }

  const supabaseServer = await createSupabaseServerClient()
  const { data, error } = await supabaseServer.auth.getUser()
  if (error || !data.user) {
    return null
  }

  return data.user
}

const assertAdmin = async (request: NextRequest) => {
  const user = await getRequestUser(request)
  if (!user) {
    return { error: jsonError('Unauthorized', 401), admin: null as null }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role,status,full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = String(profile?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  if (!isSuperAdmin || profile?.status === 'suspended') {
    return { error: jsonError('Forbidden', 403), admin: null as null }
  }

  return { error: null, admin: { ...user, full_name: profile?.full_name || user.email || 'Admin' } }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await assertAdmin(request)
    if (auth.error || !auth.admin) {
      return auth.error
    }

    const body = (await request.json().catch(() => ({}))) as CreditBody
    const userId = String(body.userId || '').trim()
    const amount = Number(body.amount)
    const note = String(body.note || '').trim()

    if (!userId) {
      return jsonError('userId is required', 400)
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError('A valid amount greater than zero is required', 400)
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,status')
      .eq('id', userId)
      .maybeSingle()

    if (targetUserError) {
      return jsonError(targetUserError.message, 500)
    }

    if (!targetUser) {
      return jsonError('User not found', 404)
    }

    if (targetUser.status === 'suspended') {
      return jsonError('Cannot credit a suspended user wallet', 400)
    }

    const reference = generateReference('ADM-CR')
    const roundedAmount = Math.round(amount * 100) / 100

    const { data: walletDelta, error: walletError } = await supabaseAdmin.rpc('wallet_apply_delta', {
      p_user_id: userId,
      p_delta: roundedAmount,
      p_reason: note || 'Admin wallet credit',
      p_reference: reference,
      p_metadata: {
        source: 'admin_credit',
        admin_id: auth.admin.id,
        admin_email: auth.admin.email || null,
        note: note || null,
      },
    })

    if (walletError) {
      return jsonError(walletError.message, 500)
    }

    const walletRow = Array.isArray(walletDelta) ? walletDelta[0] : null
    if (!walletRow?.wallet_id) {
      return jsonError('Unable to credit wallet', 500)
    }

    const description = note
      ? `Admin wallet credit: ${note}`
      : `Admin wallet credit by ${auth.admin.full_name}`

    const { error: txError } = await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'wallet',
      amount: roundedAmount,
      status: 'success',
      description,
      reference,
      wallet_applied: true,
      metadata: {
        source: 'admin_credit',
        admin_id: auth.admin.id,
        admin_email: auth.admin.email || null,
        note: note || null,
        balance_after: Number(walletRow.balance_after || 0),
      },
    })

    if (txError) {
      await supabaseAdmin.rpc('wallet_apply_delta', {
        p_user_id: userId,
        p_delta: -roundedAmount,
        p_reason: 'Admin wallet credit reversal',
        p_reference: `${reference}-RFND`,
        p_metadata: {
          source: 'admin_credit',
          reason: 'transaction_insert_failed',
        },
      })
      return jsonError(txError.message, 500)
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Wallet credited',
      message: `Your wallet was credited with GHc ${roundedAmount.toFixed(2)}${note ? `. Note: ${note}` : ''}`,
      type: 'success',
    })

    return NextResponse.json({
      success: true,
      data: {
        reference,
        amount: roundedAmount,
        balanceAfter: Number(walletRow.balance_after || 0),
        userId,
      },
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to credit wallet', 500)
  }
}
