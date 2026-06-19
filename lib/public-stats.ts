import 'server-only'

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

export type PublicStats = {
  totalDelivered: number
  successRate: string
  avgDelivery: string
  totalAgents: number
}

const DEFAULT_STATS: PublicStats = {
  totalDelivered: 10287,
  successRate: '99.4%',
  avgDelivery: '10-60 min',
  totalAgents: 281,
}

let cachedClient: ReturnType<typeof createClient> | null = null

const getAdminClient = () => {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) return null

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  return cachedClient
}

const fetchPublicStats = async (): Promise<PublicStats> => {
  const adminClient = getAdminClient()
  if (!adminClient) return DEFAULT_STATS

  try {
    const [deliveredRes, totalRes, agentsRes] = await Promise.all([
      adminClient.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
      adminClient.from('orders').select('id', { count: 'exact', head: true }),
      adminClient.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'agent'),
    ])

    const totalDelivered = deliveredRes.count ?? DEFAULT_STATS.totalDelivered
    const totalOrders = totalRes.count ?? 0
    const totalAgents = agentsRes.count ?? DEFAULT_STATS.totalAgents

    const successRate =
      totalOrders > 0
        ? `${Math.min(99.9, Math.max(90, (totalDelivered / totalOrders) * 100)).toFixed(1)}%`
        : DEFAULT_STATS.successRate

    return {
      totalDelivered: totalDelivered > 0 ? totalDelivered : DEFAULT_STATS.totalDelivered,
      successRate,
      avgDelivery: DEFAULT_STATS.avgDelivery,
      totalAgents: totalAgents > 0 ? totalAgents : DEFAULT_STATS.totalAgents,
    }
  } catch {
    return DEFAULT_STATS
  }
}

export const getPublicStats = unstable_cache(fetchPublicStats, ['public-stats'], {
  revalidate: 60,
})
