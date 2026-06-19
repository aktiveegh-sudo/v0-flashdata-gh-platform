import { supabase } from '@/lib/supabase/client'

export type AdminAgentRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  status: string
  wallet_balance: number
  storeName?: string
  storeSlug?: string
  isActive?: boolean
}

export const fetchAdminAgents = async () => {
  const [usersRes, storesRes] = await Promise.all([
    supabase.client.rpc('admin_list_users'),
    supabase.client.from('agent_stores').select('agent_id,brand_name,slug,is_active'),
  ])

  if (usersRes.error) throw new Error(usersRes.error.message)

  const stores = (storesRes.data || []) as Array<{
    agent_id: string
    brand_name: string
    slug: string
    is_active: boolean
  }>
  const storeByAgent = new Map(stores.map((s) => [s.agent_id, s]))

  const users = (usersRes.data as Array<{
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    role: string
    status: string
    wallet_balance: number
  }>) || []

  return users
    .filter((u) => storeByAgent.has(u.id) || u.role === 'agent')
    .map((u) => {
      const store = storeByAgent.get(u.id)
      return {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        wallet_balance: Number(u.wallet_balance || 0),
        storeName: store?.brand_name,
        storeSlug: store?.slug,
        isActive: store?.is_active,
      } satisfies AdminAgentRow
    })
}

export const fetchAdminSubAgents = async () => {
  const { data, error } = await supabase.client
    .from('sub_agents')
    .select('id,parent_agent_id,user_id,commission_rate,status,created_at,parent:profiles!sub_agents_parent_agent_id_fkey(full_name),child:profiles!sub_agents_user_id_fkey(full_name,email)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    const fallback = await supabase.client
      .from('sub_agents')
      .select('id,parent_agent_id,user_id,commission_rate,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (fallback.error) throw new Error(fallback.error.message)
    return fallback.data || []
  }

  return data || []
}

export const fetchAdminNotifications = async () => {
  const { data, error } = await supabase.client
    .from('notifications')
    .select('id,title,message,type,is_read,created_at,user_id')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data || []
}

export const fetchSystemHealth = async () => {
  const tables = ['orders', 'transactions', 'profiles', 'agent_stores', 'withdrawals'] as const
  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase.client.from(table).select('id', { count: 'exact', head: true })
      return { table, count: count ?? 0, ok: !error }
    })
  )

  const pendingWithdrawals = await supabase.client
    .from('withdrawals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  const pendingOrders = await supabase.client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  return {
    tables: counts,
    pendingWithdrawals: pendingWithdrawals.count ?? 0,
    pendingOrders: pendingOrders.count ?? 0,
  }
}

export const fetchAdminProfits = async () => {
  const [ordersRes, storeOrdersRes, txRes] = await Promise.all([
    supabase.client.from('orders').select('amount,status,created_at').eq('status', 'delivered'),
    supabase.client.from('agent_store_orders').select('total_price,status,created_at').eq('status', 'delivered'),
    supabase.client.from('transactions').select('amount,status,type,created_at').eq('status', 'success'),
  ])

  const orderRevenue = (ordersRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0)
  const storeRevenue = (storeOrdersRes.data || []).reduce((s, r) => s + Number(r.total_price || 0), 0)
  const txVolume = (txRes.data || []).reduce((s, r) => s + Number(r.amount || 0), 0)

  return {
    orderRevenue,
    storeRevenue,
    totalRevenue: orderRevenue + storeRevenue,
    txVolume,
    orderCount: ordersRes.data?.length || 0,
    storeOrderCount: storeOrdersRes.data?.length || 0,
  }
}

export const fetchSiteSettingsAdmin = async () => {
  const { data, error } = await supabase.client
    .from('site_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data || {}
}

export const fetchApiOrders = async () => {
  const { data, error } = await supabase.client
    .from('orders')
    .select('id,amount,status,created_at,reference,profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data || []
}

export const fetchApiUsersStats = async () => {
  const { data, error } = await supabase.client
    .from('api_users')
    .select('id,name,email,is_active,created_at,last_used_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}
