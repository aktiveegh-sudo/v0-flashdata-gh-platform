import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'
import { listAdminSecrets, upsertAdminSecrets } from '@/lib/secrets'

const ADMIN_SECRET_DEFINITIONS = [
  {
    key: 'PAYSTACK_SECRET_KEY',
    label: 'Paystack Secret Key',
    description: 'Server-side secret used to initialize, verify, and validate Paystack payments.',
    isSecret: true,
  },
  {
    key: 'SWIFTDATA_DEVELOPER_KEY',
    label: 'FlashData Developer Key',
    description: 'Bearer token used for FlashData delivery requests.',
    isSecret: true,
  },
  {
    key: 'SECONDARY_DATA_API_KEY',
    label: 'Secondary Provider API Key',
    description: 'Bearer token used for the secondary delivery provider.',
    isSecret: true,
  },
  {
    key: 'SECONDARY_DATA_WEBHOOK_URL',
    label: 'Secondary Provider Webhook URL',
    description: 'Webhook URL sent to the secondary provider for delivery updates.',
    isSecret: false,
  },
] as const

const getRequestUser = async (request: Request) => {
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

const assertAdmin = async (request: Request) => {
  const user = await getRequestUser(request)
  if (!user) {
    return { user: null, response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return { user: null, response: NextResponse.json({ success: false, error: error.message }, { status: 500 }) }
  }

  const role = String(profile?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  if (!isSuperAdmin || profile?.status === 'suspended') {
    return { user: null, response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, response: null }
}

export async function GET(request: Request) {
  try {
    const { response } = await assertAdmin(request)
    if (response) {
      return response
    }

    const rows = await listAdminSecrets(ADMIN_SECRET_DEFINITIONS.map((item) => item.key))
    const valueByKey = new Map(rows.map((row) => [row.key, row]))

    return NextResponse.json({
      success: true,
      data: ADMIN_SECRET_DEFINITIONS.map((item) => {
        const row = valueByKey.get(item.key)
        const value = row?.value || ''
        return {
          key: item.key,
          label: item.label,
          description: item.description,
          isSecret: item.isSecret,
          hasValue: Boolean(value),
          value,
          updatedAt: row?.updated_at || null,
        }
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to load admin secrets' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { user, response } = await assertAdmin(request)
    if (response || !user) {
      return response as NextResponse
    }

    const body = (await request.json().catch(() => ({}))) as {
      secrets?: Array<{ key?: string; value?: string }>
    }

    const provided = body.secrets || []
    const allowedKeys = new Set(ADMIN_SECRET_DEFINITIONS.map((item) => item.key))
    const updates = provided
      .map((item) => ({ key: String(item.key || '').trim(), value: String(item.value || '').trim() }))
      .filter((item) => item.key && allowedKeys.has(item.key))

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid secrets provided' }, { status: 400 })
    }

    await upsertAdminSecrets(
      updates.map((item) => {
        const definition = ADMIN_SECRET_DEFINITIONS.find((entry) => entry.key === item.key)
        return {
          key: item.key,
          value: item.value,
          description: definition?.description,
          isSecret: definition?.isSecret,
          updatedBy: user.id,
        }
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to save admin secrets' },
      { status: 500 }
    )
  }
}
