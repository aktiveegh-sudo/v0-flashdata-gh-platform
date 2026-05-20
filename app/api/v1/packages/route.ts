import { NextRequest } from 'next/server'
import { authenticateApiRequest, consumeUsage, jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const { data, error: packagesError } = await supabaseAdmin
    .from('data_packages')
    .select('id,network,name,amount,cost_price,agent_price,selling_price,validity,is_active')
    .eq('is_active', true)
    .order('network', { ascending: true })
    .order('cost_price', { ascending: true })

  if (packagesError) {
    return jsonError(packagesError.message, 500)
  }

  return jsonOk({ packages: data || [] })
}
