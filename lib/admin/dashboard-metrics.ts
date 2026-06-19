import { supabase } from '@/lib/supabase/client'

export type DailyPoint = { day: string; revenue: number; orders: number }
export type NetworkPoint = { network: string; sales: number }
export type StatusPoint = { status: string; count: number }
export type AuditLogRow = {
  id: string
  activity_type: string
  entity: string
  entity_id: string | null
  message: string
  created_at: string
  actor_id: string | null
  profiles?: { full_name: string | null; email: string | null } | null
}
export type AgentPerformanceRow = {
  agentId: string
  agentName: string
  storeName: string
  storeSlug: string
  isActive: boolean
  totalOrders: number
  deliveredOrders: number
  pendingOrders: number
  revenue: number
}

const dayKey = (iso: string) => (iso || '').slice(0, 10)

export const fetchAdminAnalytics = async () => {
  await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)

  const [
    ordersRes,
    storeOrdersRes,
    usersRes,
    transactionsRes,
    newUsersRes,
  ] = await Promise.all([
    supabase.client.from('orders').select('amount,status,created_at,data_packages(network)'),
    supabase.client
      .from('agent_store_orders')
      .select('total_price,status,created_at,item_type,data_packages(network)'),
    supabase.client.rpc('admin_list_users'),
    supabase.client.from('transactions').select('amount,status,created_at,type'),
    supabase.client
      .from('profiles')
      .select('id,created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
  ])

  const orders = ordersRes.data || []
  const storeOrders = storeOrdersRes.data || []
  const users = (usersRes.data as { id: string; created_at: string }[] | null) || []
  const transactions = transactionsRes.data || []
  const newUsers = newUsersRes.data || []

  const deliveredOrders = orders.filter((o) => o.status === 'delivered')
  const deliveredStore = storeOrders.filter((o) => o.status === 'delivered')

  const totalRevenue =
    deliveredOrders.reduce((sum, row) => sum + Number(row.amount || 0), 0) +
    deliveredStore.reduce((sum, row) => sum + Number(row.total_price || 0), 0)

  const today = new Date().toISOString().slice(0, 10)
  const todayRevenue =
    deliveredOrders
      .filter((row) => dayKey(row.created_at) === today)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0) +
    deliveredStore
      .filter((row) => dayKey(row.created_at) === today)
      .reduce((sum, row) => sum + Number(row.total_price || 0), 0)

  const dailyRevenue: DailyPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const orderAmount = deliveredOrders
      .filter((row) => dayKey(row.created_at) === key)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const storeAmount = deliveredStore
      .filter((row) => dayKey(row.created_at) === key)
      .reduce((sum, row) => sum + Number(row.total_price || 0), 0)
    const orderCount =
      orders.filter((row) => dayKey(row.created_at) === key).length +
      storeOrders.filter((row) => dayKey(row.created_at) === key).length

    dailyRevenue.push({
      day: d.toLocaleDateString('en-GH', { weekday: 'short' }),
      revenue: Number((orderAmount + storeAmount).toFixed(2)),
      orders: orderCount,
    })
  }

  const networkMap = new Map<string, number>()
  for (const row of deliveredOrders) {
    const network = (row as { data_packages?: { network?: string } }).data_packages?.network || 'Unknown'
    networkMap.set(network, (networkMap.get(network) || 0) + Number(row.amount || 0))
  }
  for (const row of deliveredStore) {
    const item = row as {
      item_type?: string
      data_packages?: { network?: string }
      total_price?: number
    }
    const network = item.item_type === 'service' ? 'Services' : item.data_packages?.network || 'Unknown'
    networkMap.set(network, (networkMap.get(network) || 0) + Number(item.total_price || 0))
  }

  const statusMap = new Map<string, number>()
  for (const row of [...orders, ...storeOrders]) {
    const status = String((row as { status?: string }).status || 'unknown')
    statusMap.set(status, (statusMap.get(status) || 0) + 1)
  }

  const userGrowth: DailyPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    userGrowth.push({
      day: d.toLocaleDateString('en-GH', { weekday: 'short' }),
      revenue: newUsers.filter((u) => dayKey(u.created_at) === key).length,
      orders: 0,
    })
  }

  const successTx = transactions.filter((tx) => tx.status === 'success').length

  return {
    totalRevenue,
    todayRevenue,
    totalUsers: users.length,
    totalOrders: orders.length + storeOrders.length,
    totalTransactions: transactions.length,
    successRate: transactions.length ? Math.round((successTx / transactions.length) * 1000) / 10 : 0,
    dailyRevenue,
    salesByNetwork: Array.from(networkMap.entries()).map(([network, sales]) => ({
      network,
      sales: Number(sales.toFixed(2)),
    })),
    ordersByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
    userGrowth,
  }
}

export const fetchAuditLogs = async (options?: { entity?: string; search?: string; limit?: number }) => {
  const limit = options?.limit ?? 50
  let query = supabase.client
    .from('admin_activity')
    .select('id,activity_type,entity,entity_id,message,created_at,actor_id,profiles(full_name,email)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options?.entity && options.entity !== 'all') {
    query = query.eq('entity', options.entity)
  }

  let { data, error } = await query
  if (error) {
    const fallback = await supabase.client
      .from('admin_activity')
      .select('id,activity_type,entity,entity_id,message,created_at,actor_id')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (fallback.error) throw new Error(fallback.error.message)
    data = fallback.data
  }

  let rows = (data as AuditLogRow[]) || []
  const search = (options?.search || '').trim().toLowerCase()
  if (search) {
    rows = rows.filter(
      (row) =>
        row.message.toLowerCase().includes(search) ||
        row.entity.toLowerCase().includes(search) ||
        (row.entity_id || '').toLowerCase().includes(search)
    )
  }

  return rows
}

export const fetchAgentPerformance = async () => {
  const [storesRes, storeOrdersRes, dashboardOrdersRes, usersRes] = await Promise.all([
    supabase.client
      .from('agent_stores')
      .select('id,agent_id,slug,brand_name,is_active,profiles(full_name,email)'),
    supabase.client.from('agent_store_orders').select('store_id,total_price,status'),
    supabase.client.from('orders').select('user_id,amount,status'),
    supabase.client.rpc('admin_list_users'),
  ])

  if (storesRes.error) throw new Error(storesRes.error.message)

  const stores = (storesRes.data || []) as Array<{
    id: string
    agent_id: string
    slug: string
    brand_name: string
    is_active: boolean
    profiles?: { full_name: string | null; email: string | null } | null
  }>
  const storeOrders = storeOrdersRes.data || []
  const dashboardOrders = dashboardOrdersRes.data || []
  const users = (usersRes.data as { id: string; full_name: string | null; email: string | null }[] | null) || []

  const userNameById = new Map(users.map((u) => [u.id, u.full_name || u.email || 'Agent']))

  const rows: AgentPerformanceRow[] = stores.map((store) => {
    const related = storeOrders.filter((o) => (o as { store_id: string }).store_id === store.id)
    const delivered = related.filter((o) => o.status === 'delivered')
    const pending = related.filter((o) => o.status === 'pending' || o.status === 'processing')
    const agentDashboard = dashboardOrders.filter((o) => (o as { user_id: string }).user_id === store.agent_id)
    const dashboardRevenue = agentDashboard
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + Number(o.amount || 0), 0)

    return {
      agentId: store.agent_id,
      agentName: store.profiles?.full_name || userNameById.get(store.agent_id) || 'Agent',
      storeName: store.brand_name,
      storeSlug: store.slug,
      isActive: store.is_active,
      totalOrders: related.length + agentDashboard.length,
      deliveredOrders: delivered.length + agentDashboard.filter((o) => o.status === 'delivered').length,
      pendingOrders: pending.length + agentDashboard.filter((o) => o.status === 'pending' || o.status === 'processing').length,
      revenue:
        delivered.reduce((sum, o) => sum + Number(o.total_price || 0), 0) + dashboardRevenue,
    }
  })

  return rows.sort((a, b) => b.revenue - a.revenue)
}
