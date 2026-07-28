import { NextRequest } from 'next/server'
import { assertAdminRequest } from '@/lib/admin/auth'
import { jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { response } = await assertAdminRequest(request)
  if (response) {
    return response
  }

  const { id: userId } = await context.params
  if (!userId?.trim()) {
    return jsonError('User id is required', 400)
  }

  try {
    await fetch(new URL('/api/orders/auto-complete', request.url), { method: 'POST' }).catch(() => null)

    const [profileRes, walletRes, storeRes, transactionsRes, ordersRes, withdrawalsRes, afaRes, asChildRes, asParentRes] =
      await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
      supabaseAdmin
        .from('agent_stores')
        .select(
          'id,slug,brand_name,tagline,description,logo_url,theme_color,contact_phone,contact_email,whatsapp_number,allow_data,allow_online_services,is_active,created_at,updated_at'
        )
        .eq('agent_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('transactions')
        .select('id,type,amount,status,reference,description,metadata,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('orders')
        .select('id,phone,amount,status,reference,package_id,metadata,created_at,data_packages(name,network,amount)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('withdrawals')
        .select('id,amount,payment_method,account_number,account_name,status,requested_at,processed_at,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('afa_registrations')
        .select('id,phone,full_name,ghana_card_number,location,amount,status,reference,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('sub_agents')
        .select(
          'id,status,parent_agent_id,created_at,parent:profiles!sub_agents_parent_agent_id_fkey(id,full_name,email)'
        )
        .eq('user_id', userId)
        .maybeSingle(),
      supabaseAdmin
        .from('sub_agents')
        .select(
          'id,status,user_id,created_at,child:profiles!sub_agents_user_id_fkey(id,full_name,email,phone)'
        )
        .eq('parent_agent_id', userId)
        .order('created_at', { ascending: false }),
    ])

    if (profileRes.error) {
      return jsonError(profileRes.error.message, 500)
    }

    if (!profileRes.data) {
      return jsonError('User not found', 404)
    }

    const store = storeRes.data
    let storeOrders: unknown[] = []
    let storePackages: unknown[] = []
    let storeServices: unknown[] = []

    if (store?.id) {
      const [storeOrdersRes, packagesRes, servicesRes] = await Promise.all([
        supabaseAdmin
          .from('agent_store_orders')
          .select(
            'id,item_type,customer_name,customer_phone,customer_note,total_price,status,quantity,created_at,data_packages(name,network,amount),online_services(name,category)'
          )
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabaseAdmin
          .from('agent_store_packages')
          .select('id,selling_price,is_active,data_packages(id,name,network,amount,validity)')
          .eq('store_id', store.id)
          .order('selling_price', { ascending: true }),
        supabaseAdmin
          .from('agent_store_service_prices')
          .select('id,selling_price,is_active,online_services(id,name,category)')
          .eq('store_id', store.id)
          .order('selling_price', { ascending: true }),
      ])

      storeOrders = storeOrdersRes.data || []
      storePackages = packagesRes.data || []
      storeServices = servicesRes.data || []
    }

    const transactions = (transactionsRes.data || []).map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
    }))
    const sales = transactions.filter((row) => row.type === 'store_sale')
    const orders = (ordersRes.data || []).map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
    }))
    const withdrawals = (withdrawalsRes.data || []).map((row) => ({
      ...row,
      amount: Number(row.amount || 0),
    }))
    const mappedStoreOrders = (storeOrders as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      total_price: Number(row.total_price || 0),
    }))

    const walletBalance = Number(walletRes.data?.balance || 0)
    const totalSales = sales.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const totalWithdrawn = withdrawals
      .filter((row) => row.status === 'approved')
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const totalDataSpend = orders.reduce((sum, row) => sum + Number(row.amount || 0), 0)

    return jsonOk({
      profile: profileRes.data,
      wallet: walletRes.data
        ? {
            balance: walletBalance,
            last_updated: walletRes.data.last_updated || walletRes.data.updated_at || null,
          }
        : null,
      store: store || null,
      transactions,
      sales,
      orders,
      withdrawals,
      afaRegistrations: afaRes.data || [],
      storeOrders: mappedStoreOrders,
      storePackages,
      storeServices,
      subAgentOf: asChildRes.data || null,
      subAgents: asParentRes.data || [],
      stats: {
        walletBalance,
        totalSales,
        totalWithdrawn,
        totalDataSpend,
        transactionCount: transactions.length,
        orderCount: orders.length,
        storeOrderCount: mappedStoreOrders.length,
        storeOrderDelivered: mappedStoreOrders.filter((row) => row.status === 'delivered').length,
        withdrawalCount: withdrawals.length,
        packageCount: storePackages.length,
        serviceCount: storeServices.length,
        afaCount: (afaRes.data || []).length,
        subAgentCount: (asParentRes.data || []).length,
      },
    })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to load user dossier', 500)
  }
}
