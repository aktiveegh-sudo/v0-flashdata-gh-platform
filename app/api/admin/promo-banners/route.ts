import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

const jsonError = (message: string, status = 400) =>
  NextResponse.json({ success: false, error: message }, { status })

const getRequestUser = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || ''
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

  if (bearer) {
    const { data, error } = await supabaseAdmin.auth.getUser(bearer)
    if (!error && data.user) return data.user
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

const assertAdmin = async (request: NextRequest) => {
  const user = await getRequestUser(request)
  if (!user) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .maybeSingle()

  const isSuperAdmin =
    profile?.role === 'super_admin' || (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  if (!isSuperAdmin || profile?.status === 'suspended') return null

  return user
}

export async function GET(request: NextRequest) {
  if (!(await assertAdmin(request))) return jsonError('Forbidden', 403)

  const { data, error } = await supabaseAdmin
    .from('promo_banners')
    .select('id,image_url,sort_order,is_active,created_at,updated_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(request: NextRequest) {
  if (!(await assertAdmin(request))) return jsonError('Forbidden', 403)

  const body = (await request.json().catch(() => ({}))) as {
    image_url?: string
    sort_order?: number
    is_active?: boolean
  }

  const imageUrl = (body.image_url || '').trim()
  if (!imageUrl) return jsonError('image_url is required')

  const { data, error } = await supabaseAdmin
    .from('promo_banners')
    .insert({
      image_url: imageUrl,
      sort_order: Number(body.sort_order ?? 0),
      is_active: body.is_active ?? true,
    })
    .select('id,image_url,sort_order,is_active,created_at')
    .single()

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({ success: true, data })
}

export async function PATCH(request: NextRequest) {
  if (!(await assertAdmin(request))) return jsonError('Forbidden', 403)

  const body = (await request.json().catch(() => ({}))) as {
    id?: string
    image_url?: string
    sort_order?: number
    is_active?: boolean
  }

  if (!body.id) return jsonError('id is required')

  const patch: Record<string, unknown> = {}
  if (body.image_url !== undefined) patch.image_url = body.image_url.trim()
  if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order)
  if (body.is_active !== undefined) patch.is_active = body.is_active

  const { data, error } = await supabaseAdmin
    .from('promo_banners')
    .update(patch)
    .eq('id', body.id)
    .select('id,image_url,sort_order,is_active,updated_at')
    .single()

  if (error) return jsonError(error.message, 500)

  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: NextRequest) {
  if (!(await assertAdmin(request))) return jsonError('Forbidden', 403)

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return jsonError('id is required')

  const { error } = await supabaseAdmin.from('promo_banners').delete().eq('id', id)
  if (error) return jsonError(error.message, 500)

  return NextResponse.json({ success: true })
}
