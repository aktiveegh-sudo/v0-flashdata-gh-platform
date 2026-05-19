import { NextRequest } from 'next/server'
import { authenticateApiRequest, consumeUsage, jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const { data, error: servicesError } = await supabaseAdmin
    .from('online_services')
    .select('id,name,category,description,price,is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (servicesError) {
    return jsonError(servicesError.message, 500)
  }

  return jsonOk({ services: data || [] })
}
