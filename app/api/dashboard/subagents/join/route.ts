import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'
import { linkUserAsSubAgent, resolveParentAgentIdFromStoreSlug } from '@/lib/dashboard/subagent'

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

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return jsonError('Please login again', 401)
  }

  const body = (await request.json().catch(() => ({}))) as { storeSlug?: string; parentAgentId?: string }
  let parentAgentId = (body.parentAgentId || '').trim()

  if (!parentAgentId && body.storeSlug) {
    const resolved = await resolveParentAgentIdFromStoreSlug(body.storeSlug)
    if (!resolved) {
      return jsonError('Store not found or inactive', 404)
    }
    parentAgentId = resolved
  }

  if (!parentAgentId) {
    return jsonError('storeSlug or parentAgentId is required', 400)
  }

  const result = await linkUserAsSubAgent({
    parentAgentId,
    userId: authUser.id,
    status: 'active',
  })

  if (!result.ok) {
    return jsonError(result.error, 400)
  }

  // Ensure subagent can run a store like any agent
  const { data: existingStore } = await supabaseAdmin
    .from('agent_stores')
    .select('id')
    .eq('agent_id', authUser.id)
    .maybeSingle()

  if (!existingStore) {
    const baseSlug =
      (authUser.email || '').split('@')[0].replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() ||
      `agent-${authUser.id.slice(0, 8)}`
    let slug = baseSlug
    for (let i = 0; i < 5; i += 1) {
      const candidate = i === 0 ? slug : `${baseSlug}-${i + 1}`
      const { data: clash } = await supabaseAdmin.from('agent_stores').select('id').eq('slug', candidate).maybeSingle()
      if (!clash) {
        slug = candidate
        break
      }
    }

    await supabaseAdmin.from('agent_stores').insert({
      agent_id: authUser.id,
      slug,
      brand_name: (authUser.user_metadata as { full_name?: string })?.full_name || 'My Store',
      is_active: true,
      allow_data: true,
      allow_online_services: true,
    })
  }

  return NextResponse.json({
    success: true,
    data: { subAgentId: result.id, parentAgentId },
  })
}
