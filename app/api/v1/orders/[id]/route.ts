import { NextRequest } from 'next/server'
import { authenticateApiRequest, consumeUsage, jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, apiUser } = await authenticateApiRequest(request)
  if (error || !apiUser) return error

  const usageError = await consumeUsage(apiUser)
  if (usageError) return usageError

  const { id } = await params

  // Try data orders first
  const { data: dataOrder, error: dataErr } = await supabaseAdmin
    .from('orders')
    .select('id,package_id,phone,amount,status,reference,created_at,metadata,data_packages(network,name,amount)')
    .eq('id', id)
    .eq('user_id', apiUser.user_id)
    .maybeSingle()

  if (dataErr) return jsonError(dataErr.message, 500)

  if (dataOrder) {
    return jsonOk({
      order: {
        id: dataOrder.id,
        type: 'data',
        reference: dataOrder.reference,
        phone: dataOrder.phone,
        amount: dataOrder.amount,
        status: dataOrder.status,
        created_at: dataOrder.created_at,
        metadata: dataOrder.metadata,
        package: dataOrder.data_packages,
      },
    })
  }

  // Try AFA registrations
  const { data: afaOrder, error: afaErr } = await supabaseAdmin
    .from('afa_registrations')
    .select('id,full_name,phone,ghana_card_number,location,amount,status,reference,created_at')
    .eq('id', id)
    .eq('user_id', apiUser.user_id)
    .maybeSingle()

  if (afaErr) return jsonError(afaErr.message, 500)

  if (afaOrder) {
    return jsonOk({
      order: {
        id: afaOrder.id,
        type: 'afa',
        reference: afaOrder.reference,
        phone: afaOrder.phone,
        full_name: afaOrder.full_name,
        ghana_card_number: afaOrder.ghana_card_number,
        location: afaOrder.location,
        amount: afaOrder.amount,
        status: afaOrder.status,
        created_at: afaOrder.created_at,
      },
    })
  }

  return jsonError('Order not found', 404)
}
