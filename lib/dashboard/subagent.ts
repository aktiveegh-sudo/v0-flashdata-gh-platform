import 'server-only'

import { supabaseAdmin } from '@/lib/api/rest'

export type SubAgentLink = {
  id: string
  parent_agent_id: string
  user_id: string
  status: string
  commission_rate: number
}

export type BuyerPriceResult = {
  amount: number
  platformAgentPrice: number
  isSubAgent: boolean
  parentAgentId: string | null
  margin: number
}

export const getActiveSubAgentLink = async (userId: string): Promise<SubAgentLink | null> => {
  const { data, error } = await supabaseAdmin
    .from('sub_agents')
    .select('id,parent_agent_id,user_id,status,commission_rate')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return null
  return data as SubAgentLink
}

export const isActiveSubAgent = async (userId: string) => Boolean(await getActiveSubAgentLink(userId))

export const assertCanRecruitSubAgents = async (parentAgentId: string) => {
  const link = await getActiveSubAgentLink(parentAgentId)
  if (link) {
    return { ok: false as const, error: 'Subagents cannot recruit other subagents' }
  }
  return { ok: true as const }
}

export const linkUserAsSubAgent = async (input: {
  parentAgentId: string
  userId: string
  status?: 'pending' | 'active' | 'suspended'
}) => {
  if (input.parentAgentId === input.userId) {
    return { ok: false as const, error: 'You cannot join your own store as a subagent' }
  }

  const recruitGuard = await assertCanRecruitSubAgents(input.parentAgentId)
  if (!recruitGuard.ok) return recruitGuard

  const { data: existingChildren } = await supabaseAdmin
    .from('sub_agents')
    .select('id')
    .eq('parent_agent_id', input.userId)
    .eq('status', 'active')
    .limit(1)

  if ((existingChildren || []).length > 0) {
    return {
      ok: false as const,
      error: 'Agents who already have active subagents cannot become a subagent',
    }
  }

  const { data: existing } = await supabaseAdmin
    .from('sub_agents')
    .select('id,parent_agent_id,status')
    .eq('user_id', input.userId)
    .maybeSingle()

  if (existing) {
    if (existing.parent_agent_id !== input.parentAgentId) {
      return { ok: false as const, error: 'You are already linked to another agent as a subagent' }
    }

    if (existing.status !== (input.status || 'active')) {
      const { error: updateError } = await supabaseAdmin
        .from('sub_agents')
        .update({ status: input.status || 'active', updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        return { ok: false as const, error: updateError.message }
      }
    }

    return { ok: true as const, id: existing.id as string }
  }

  const { data: created, error } = await supabaseAdmin
    .from('sub_agents')
    .insert({
      parent_agent_id: input.parentAgentId,
      user_id: input.userId,
      status: input.status || 'active',
      commission_rate: 0,
    })
    .select('id')
    .single()

  if (error || !created) {
    return { ok: false as const, error: error?.message || 'Unable to link subagent' }
  }

  return { ok: true as const, id: created.id as string }
}

export const resolveBuyerUnitPrice = async (input: {
  buyerId: string
  kind: 'data' | 'service' | 'afa'
  packageId?: string
  serviceId?: string
  platformAgentPrice: number
}): Promise<BuyerPriceResult> => {
  const platformAgentPrice = Math.max(0, Number(input.platformAgentPrice || 0))
  const link = await getActiveSubAgentLink(input.buyerId)

  if (!link) {
    return {
      amount: platformAgentPrice,
      platformAgentPrice,
      isSubAgent: false,
      parentAgentId: null,
      margin: 0,
    }
  }

  let catalogPrice: number | null = null

  if (input.kind === 'data' && input.packageId) {
    const { data } = await supabaseAdmin
      .from('sub_agent_package_prices')
      .select('price')
      .eq('parent_agent_id', link.parent_agent_id)
      .eq('package_id', input.packageId)
      .maybeSingle()
    if (data?.price != null) catalogPrice = Number(data.price)
  }

  if (input.kind === 'service' && input.serviceId) {
    const { data } = await supabaseAdmin
      .from('sub_agent_service_prices')
      .select('price')
      .eq('parent_agent_id', link.parent_agent_id)
      .eq('service_id', input.serviceId)
      .maybeSingle()
    if (data?.price != null) catalogPrice = Number(data.price)
  }

  if (input.kind === 'afa') {
    const { data } = await supabaseAdmin
      .from('sub_agent_afa_prices')
      .select('price')
      .eq('parent_agent_id', link.parent_agent_id)
      .maybeSingle()
    if (data?.price != null) catalogPrice = Number(data.price)
  }

  const amount = Math.max(platformAgentPrice, catalogPrice ?? platformAgentPrice)
  const margin = Math.max(0, amount - platformAgentPrice)

  return {
    amount,
    platformAgentPrice,
    isSubAgent: true,
    parentAgentId: link.parent_agent_id,
    margin,
  }
}

export const creditParentSubagentMargin = async (input: {
  parentAgentId: string
  subagentUserId: string
  margin: number
  reference: string
  metadata?: Record<string, unknown>
}) => {
  const margin = Number(input.margin || 0)
  if (!Number.isFinite(margin) || margin <= 0) {
    return { ok: true as const, skipped: true as const }
  }

  const { error } = await supabaseAdmin.rpc('wallet_apply_delta', {
    p_user_id: input.parentAgentId,
    p_delta: margin,
    p_reason: 'subagent_margin',
    p_reference: `${input.reference}-MRG`,
    p_metadata: {
      source: 'subagent_margin',
      subagent_user_id: input.subagentUserId,
      base_reference: input.reference,
      ...(input.metadata || {}),
    },
  })

  if (error) {
    console.error('[Subagent] Parent margin credit failed:', error.message)
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const, skipped: false as const }
}

export const resolveParentAgentIdFromStoreSlug = async (slug: string) => {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null

  const { data } = await supabaseAdmin
    .from('agent_stores')
    .select('agent_id,slug,is_active')
    .eq('slug', normalized)
    .maybeSingle()

  if (!data?.agent_id || data.is_active === false) return null
  return String(data.agent_id)
}
