import { NextRequest } from 'next/server'
import { getAuthenticatedDashboardUser } from '@/lib/dashboard/auth'
import { jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedDashboardUser(request)
    if (!authUser) {
      return jsonError('Please login again', 401)
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from('agent_stores')
      .select('id,slug,brand_name')
      .eq('agent_id', authUser.id)
      .maybeSingle()

    if (storeError) {
      return jsonError(storeError.message, 500)
    }

    if (!store) {
      return jsonOk({ store: null, orders: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('agent_store_orders')
      .select(
        'id,item_type,customer_name,customer_phone,customer_email,customer_note,quantity,total_price,status,created_at,data_packages(network,name,amount),online_services(name,category)'
      )
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    if (error) {
      return jsonError(error.message, 500)
    }

    return jsonOk({
      store,
      orders: data || [],
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load store orders', 500)
  }
}
