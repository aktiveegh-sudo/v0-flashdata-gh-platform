import { NextRequest } from 'next/server'
import { authenticateApiRequest, consumeUsage, jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const limitRaw = Number(new URL(request.url).searchParams.get('limit') || 50)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50

  const { data, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('id,type,amount,description,status,reference,created_at,metadata')
    .eq('user_id', apiUser.user_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (txError) {
    return jsonError(txError.message, 500)
  }

  return jsonOk({ transactions: data || [] })
}
