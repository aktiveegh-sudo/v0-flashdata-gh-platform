import { NextRequest } from 'next/server'
import { assertAdminRequest } from '@/lib/admin/auth'
import { jsonError, jsonOk, supabaseAdmin } from '@/lib/api/rest'
import { assertCanRecruitSubAgents } from '@/lib/dashboard/subagent'

type Body = {
  id?: string
  status?: 'pending' | 'active' | 'suspended'
  parentAgentId?: string
  userId?: string
  action?: 'update' | 'delete' | 'reparent' | 'create'
}

export async function GET(request: NextRequest) {
  const { response } = await assertAdminRequest(request)
  if (response) return response

  const { data, error } = await supabaseAdmin
    .from('sub_agents')
    .select(
      'id,parent_agent_id,user_id,commission_rate,status,created_at,updated_at,parent:profiles!sub_agents_parent_agent_id_fkey(id,full_name,email),child:profiles!sub_agents_user_id_fkey(id,full_name,email,phone)'
    )
    .order('created_at', { ascending: false })

  if (error) return jsonError(error.message, 500)
  return jsonOk({ rows: data || [] })
}

export async function POST(request: NextRequest) {
  const { response } = await assertAdminRequest(request)
  if (response) return response

  const body = (await request.json().catch(() => ({}))) as Body
  const action = body.action || 'update'

  if (action === 'create') {
    if (!body.parentAgentId || !body.userId) {
      return jsonError('parentAgentId and userId are required', 400)
    }
    const recruit = await assertCanRecruitSubAgents(body.parentAgentId)
    if (!recruit.ok) return jsonError(recruit.error, 400)

    const { data, error } = await supabaseAdmin
      .from('sub_agents')
      .insert({
        parent_agent_id: body.parentAgentId,
        user_id: body.userId,
        status: body.status || 'active',
        commission_rate: 0,
      })
      .select('id')
      .single()

    if (error) return jsonError(error.message, 400)
    return jsonOk({ id: data.id })
  }

  if (action === 'delete') {
    if (!body.id) return jsonError('id is required', 400)
    const { error } = await supabaseAdmin.from('sub_agents').delete().eq('id', body.id)
    if (error) return jsonError(error.message, 500)
    return jsonOk({ deleted: true })
  }

  if (action === 'reparent') {
    if (!body.id || !body.parentAgentId) {
      return jsonError('id and parentAgentId are required', 400)
    }
    const recruit = await assertCanRecruitSubAgents(body.parentAgentId)
    if (!recruit.ok) return jsonError(recruit.error, 400)

    const { error } = await supabaseAdmin
      .from('sub_agents')
      .update({
        parent_agent_id: body.parentAgentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)

    if (error) return jsonError(error.message, 500)
    return jsonOk({ reparented: true })
  }

  if (!body.id || !body.status) {
    return jsonError('id and status are required', 400)
  }

  const { error } = await supabaseAdmin
    .from('sub_agents')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) return jsonError(error.message, 500)
  return jsonOk({ updated: true })
}
