import { NextRequest } from 'next/server'
import { authenticateApiRequest, consumeUsage, jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const { data, error: walletError } = await supabaseAdmin
    .from('wallets')
    .select('balance,last_updated')
    .eq('user_id', apiUser.user_id)
    .maybeSingle()

  if (walletError) {
    return jsonError(walletError.message, 500)
  }

  return jsonOk({
    balance: Number(data?.balance || 0),
    last_updated: data?.last_updated || null,
  })
}
