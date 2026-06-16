import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

export type AdminRequestUser = {
  id: string
  email?: string | null
  full_name: string
}

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

export const assertAdminRequest = async (request: NextRequest) => {
  const user = await getRequestUser(request)
  if (!user) {
    return {
      admin: null as AdminRequestUser | null,
      response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role,status,full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = String(profile?.role || '').toLowerCase()
  const isSuperAdmin = role === 'super_admin' || (user.email || '').toLowerCase() === 'admin@flashdatagh.com'

  if (!isSuperAdmin || profile?.status === 'suspended') {
    return {
      admin: null as AdminRequestUser | null,
      response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    admin: {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.email || 'Admin',
    },
    response: null as NextResponse | null,
  }
}
