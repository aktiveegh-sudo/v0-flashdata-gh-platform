import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

type ServicePayload = {
  id?: string
  name?: string
  description?: string | null
  category?: string | null
  price?: number
  image_url?: string | null
  is_active?: boolean
}

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
    return { error: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }), user: null }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .maybeSingle()

  const role = String(profile?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  if (!isSuperAdmin || profile?.status === 'suspended') {
    return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }), user: null }
  }

  return { error: null, user }
}

const normalizePayload = (input: ServicePayload) => {
  const name = String(input.name || '').trim()
  const description = String(input.description || '').trim() || null
  const category = String(input.category || '').trim() || 'General'
  const price = Number(input.price)
  const image_url = String(input.image_url || '').trim() || null
  const is_active = input.is_active ?? true

  if (!name || Number.isNaN(price) || price < 0) {
    return { error: 'Name and valid price are required', payload: null }
  }

  return {
    error: null,
    payload: {
      name,
      description,
      category,
      price,
      image_url,
      is_active,
    },
  }
}

export async function GET(request: Request) {
  const { error } = await assertAdmin(request)
  if (error) return error

  const { data, error: dbError } = await supabaseAdmin
    .from('online_services')
    .select('id,name,description,category,price,image_url,is_active,created_at')
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(request: Request) {
  const { error } = await assertAdmin(request)
  if (error) return error

  const input = (await request.json().catch(() => ({}))) as ServicePayload
  const normalized = normalizePayload(input)

  if (normalized.error || !normalized.payload) {
    return NextResponse.json({ success: false, error: normalized.error || 'Invalid input' }, { status: 400 })
  }

  const { data, error: dbError } = await supabaseAdmin
    .from('online_services')
    .insert(normalized.payload)
    .select('id,name,description,category,price,image_url,is_active,created_at')
    .single()

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: Request) {
  const { error } = await assertAdmin(request)
  if (error) return error

  const input = (await request.json().catch(() => ({}))) as ServicePayload
  const id = String(input.id || '').trim()

  if (!id) {
    return NextResponse.json({ success: false, error: 'Service id is required' }, { status: 400 })
  }

  const normalized = normalizePayload(input)
  if (normalized.error || !normalized.payload) {
    return NextResponse.json({ success: false, error: normalized.error || 'Invalid input' }, { status: 400 })
  }

  const { data, error: dbError } = await supabaseAdmin
    .from('online_services')
    .update(normalized.payload)
    .eq('id', id)
    .select('id,name,description,category,price,image_url,is_active,created_at')
    .single()

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: Request) {
  const { error } = await assertAdmin(request)
  if (error) return error

  const input = (await request.json().catch(() => ({}))) as ServicePayload
  const id = String(input.id || '').trim()

  if (!id) {
    return NextResponse.json({ success: false, error: 'Service id is required' }, { status: 400 })
  }

  const { error: dbError } = await supabaseAdmin.from('online_services').delete().eq('id', id)

  if (dbError) {
    return NextResponse.json({ success: false, error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
