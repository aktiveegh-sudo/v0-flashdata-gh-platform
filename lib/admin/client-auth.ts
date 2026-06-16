import { supabase } from '@/lib/supabase/client'

export const getAdminAuthHeaders = async (withJson = true) => {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token || ''

  return {
    ...(withJson ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }
}
