import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'
import { assertCanRecruitSubAgents } from '@/lib/dashboard/subagent'

const jsonError = (message: string, status = 400) => NextResponse.json({ success: false, error: message }, { status })

const getAuthUser = async (request: NextRequest) => {
  const supabaseServer = await createSupabaseServerClient()
  const { data: cookieAuth, error: cookieError } = await supabaseServer.auth.getUser()
  if (!cookieError && cookieAuth.user) return cookieAuth.user

  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return jsonError('Please login again', 401)

  const recruit = await assertCanRecruitSubAgents(authUser.id)
  if (!recruit.ok) return jsonError(recruit.error, 403)

  const { data: children, error } = await supabaseAdmin
    .from('sub_agents')
    .select('user_id,status,profiles(full_name,email,phone)')
    .eq('parent_agent_id', authUser.id)

  if (error) return jsonError(error.message, 500)

  const activeIds = (children || []).filter((row) => row.status === 'active').map((row) => row.user_id)
  const profileById = new Map(
    (children || []).map((row) => [
      row.user_id,
      Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
    ])
  )

  if (activeIds.length === 0) {
    return NextResponse.json({ success: true, data: { orders: [] } })
  }

  const { data: childStores } = await supabaseAdmin
    .from('agent_stores')
    .select('id,agent_id,brand_name,slug')
    .in('agent_id', activeIds)

  const storeIds = (childStores || []).map((s) => s.id)
  const storeById = new Map((childStores || []).map((s) => [s.id, s]))
  const storeByAgent = new Map((childStores || []).map((s) => [s.agent_id, s]))

  const [{ data: dataOrders }, { data: afaOrders }, { data: airtimeTx }, { data: storeOrders }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id,user_id,phone,amount,status,reference,created_at,data_packages(name,network,amount)')
      .in('user_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('afa_registrations')
      .select('id,user_id,full_name,phone,amount,status,reference,created_at')
      .in('user_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('transactions')
      .select('id,user_id,amount,status,reference,description,created_at,metadata')
      .in('user_id', activeIds)
      .eq('type', 'airtime')
      .order('created_at', { ascending: false })
      .limit(50),
    storeIds.length
      ? supabaseAdmin
          .from('agent_store_orders')
          .select('id,store_id,customer_name,customer_phone,total_price,status,item_type,created_at,customer_note')
          .in('store_id', storeIds)
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ])

  type Unified = {
    id: string
    kind: string
    subagentName: string
    phone: string
    amount: number
    status: string
    reference: string
    createdAt: string
    itemLabel: string
  }

  const orders: Unified[] = []

  for (const row of dataOrders || []) {
    const pkg = Array.isArray(row.data_packages) ? row.data_packages[0] : row.data_packages
    const profile = profileById.get(row.user_id) as { full_name?: string | null } | null
    orders.push({
      id: row.id,
      kind: 'data',
      subagentName: profile?.full_name || 'Sub-agent',
      phone: row.phone,
      amount: Number(row.amount || 0),
      status: row.status,
      reference: row.reference || row.id,
      createdAt: row.created_at,
      itemLabel: pkg ? `${pkg.amount} ${pkg.network}` : 'Data',
    })
  }

  for (const row of afaOrders || []) {
    const profile = profileById.get(row.user_id) as { full_name?: string | null } | null
    orders.push({
      id: row.id,
      kind: 'afa',
      subagentName: profile?.full_name || row.full_name || 'Sub-agent',
      phone: row.phone,
      amount: Number(row.amount || 0),
      status: row.status,
      reference: row.reference || row.id,
      createdAt: row.created_at,
      itemLabel: 'AFA Registration',
    })
  }

  for (const row of airtimeTx || []) {
    const profile = profileById.get(row.user_id) as { full_name?: string | null } | null
    orders.push({
      id: row.id,
      kind: 'airtime',
      subagentName: profile?.full_name || 'Sub-agent',
      phone: String((row.metadata as { phone?: string } | null)?.phone || ''),
      amount: Number(row.amount || 0),
      status: row.status,
      reference: row.reference || row.id,
      createdAt: row.created_at,
      itemLabel: row.description || 'Airtime',
    })
  }

  for (const row of storeOrders || []) {
    const store = storeById.get(String(row.store_id))
    const profile = store ? (profileById.get(store.agent_id) as { full_name?: string | null } | null) : null
    orders.push({
      id: String(row.id),
      kind: `store_${row.item_type || 'order'}`,
      subagentName: profile?.full_name || store?.brand_name || 'Sub-agent',
      phone: String(row.customer_phone || ''),
      amount: Number(row.total_price || 0),
      status: String(row.status || ''),
      reference: String(row.customer_note || '').match(/Ref:\s*([^\s|]+)/i)?.[1] || String(row.id),
      createdAt: String(row.created_at),
      itemLabel: `Store ${row.item_type || 'order'}`,
    })
  }

  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return NextResponse.json({
    success: true,
    data: {
      orders: orders.slice(0, 150),
      subagentCount: activeIds.length,
      storeCount: storeByAgent.size,
    },
  })
}
