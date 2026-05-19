import { NextRequest } from 'next/server'
import { authenticateApiRequest, consumeUsage, jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(request: NextRequest) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const url = new URL(request.url)
  const limitRaw = Number(url.searchParams.get('limit') || 20)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20
  const status = url.searchParams.get('status') || null
  const type = url.searchParams.get('type') || null // 'data' | 'afa'

  // fetch data orders
  let dataQuery = supabaseAdmin
    .from('orders')
    .select('id,package_id,phone,amount,status,reference,created_at,metadata,data_packages(network,name,amount)')
    .eq('user_id', apiUser.user_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) dataQuery = dataQuery.eq('status', status)

  // fetch AFA registrations
  let afaQuery = supabaseAdmin
    .from('afa_registrations')
    .select('id,full_name,phone,ghana_card_number,location,amount,status,reference,created_at')
    .eq('user_id', apiUser.user_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) afaQuery = afaQuery.eq('status', status)

  const [{ data: dataOrders, error: dataErr }, { data: afaOrders, error: afaErr }] =
    type === 'afa'
      ? [{ data: [], error: null }, await afaQuery]
      : type === 'data'
        ? [await dataQuery, { data: [], error: null }]
        : await Promise.all([dataQuery, afaQuery])

  if (dataErr) return jsonError(dataErr.message, 500)
  if (afaErr) return jsonError(afaErr.message, 500)

  const mapped = [
    ...(dataOrders || []).map((o: Record<string, unknown>) => ({
      id: o.id,
      type: 'data',
      reference: o.reference,
      phone: o.phone,
      amount: o.amount,
      status: o.status,
      created_at: o.created_at,
      package: o.data_packages,
    })),
    ...(afaOrders || []).map((o: Record<string, unknown>) => ({
      id: o.id,
      type: 'afa',
      reference: o.reference,
      phone: o.phone,
      full_name: o.full_name,
      ghana_card_number: o.ghana_card_number,
      location: o.location,
      amount: o.amount,
      status: o.status,
      created_at: o.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, limit)

  return jsonOk({ orders: mapped, count: mapped.length })
}
