import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'

export const getAuthenticatedDashboardUser = async (request: NextRequest) => {
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
