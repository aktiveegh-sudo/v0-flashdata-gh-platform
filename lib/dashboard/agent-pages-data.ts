import { supabase } from '@/lib/supabase/client'

export type AddressBookEntry = {
  name: string
  phone: string
  orders: number
  lastOrderAt: string
}

export type LeaderboardEntry = {
  rank: number
  name: string
  points: number
  streak: number
}

export type SubAgentRow = {
  id: string
  user_id: string
  commission_rate: number
  status: string
  created_at: string
  profiles?: { full_name: string | null; email: string | null; phone: string | null } | null
}

export const fetchAddressBook = async (userId: string) => {
  const { data: store } = await supabase.client
    .from('agent_stores')
    .select('id')
    .eq('agent_id', userId)
    .maybeSingle()

  if (!store?.id) return [] as AddressBookEntry[]

  const { data } = await supabase.client
    .from('agent_store_orders')
    .select('customer_name,customer_phone,created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const map = new Map<string, AddressBookEntry>()
  for (const row of data || []) {
    const phone = String(row.customer_phone || '').trim()
    if (!phone) continue
    const existing = map.get(phone)
    if (existing) {
      existing.orders += 1
      if (row.created_at > existing.lastOrderAt) existing.lastOrderAt = row.created_at
    } else {
      map.set(phone, {
        name: row.customer_name || 'Customer',
        phone,
        orders: 1,
        lastOrderAt: row.created_at,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.orders - a.orders)
}

export const fetchSubAgents = async (userId: string) => {
  const { data, error } = await supabase.client
    .from('sub_agents')
    .select('id,user_id,commission_rate,status,created_at,profiles(full_name,email,phone)')
    .eq('parent_agent_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as SubAgentRow[]) || []
}

export const fetchAgentStore = async (userId: string) => {
  const { data } = await supabase.client
    .from('agent_stores')
    .select('id,slug,brand_name,tagline,is_active')
    .eq('agent_id', userId)
    .maybeSingle()

  return data
}

export const fetchLeaderboard = async () => {
  const { data, error } = await supabase.client
    .from('profiles')
    .select('full_name,loyalty_points,streak_count')
    .order('loyalty_points', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return ((data || []) as { full_name: string | null; loyalty_points: number; streak_count: number }[])
    .filter((row) => (row.loyalty_points || 0) > 0)
    .map((row, index) => ({
      rank: index + 1,
      name: row.full_name || 'Agent',
      points: row.loyalty_points || 0,
      streak: row.streak_count || 0,
    })) as LeaderboardEntry[]
}

export const fetchScheduledOrders = async (userId: string) => {
  const { data } = await supabase.client
    .from('orders')
    .select('id,amount,status,created_at,metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data || []).filter((row) => {
    const meta = row.metadata as { scheduled_for?: string } | null
    return Boolean(meta?.scheduled_for)
  })
}
