export type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  role: 'user' | 'super_admin'
  status: 'active' | 'suspended'
  avatar_url: string | null
  created_at: string
  wallets?: { balance: number }[]
  wallet_balance?: number | null
}

export type MetricCard = {
  label: string
  value: string
  helper?: string
}

export type AdminActivity = {
  id: string
  actor_id: string | null
  activity_type: string
  entity: string
  entity_id: string | null
  message: string
  metadata: Record<string, unknown>
  created_at: string
}
