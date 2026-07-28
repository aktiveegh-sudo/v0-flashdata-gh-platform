import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/api/rest'
import { assertCanRecruitSubAgents, getActiveSubAgentLink } from '@/lib/dashboard/subagent'

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

/** Returns wholesale/cost floors the authenticated buyer should use for store markups. */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return jsonError('Please login again', 401)

  const [{ data: packages }, { data: services }, { data: afa }] = await Promise.all([
    supabaseAdmin
      .from('data_packages')
      .select('id,agent_price,selling_price,cost_price,is_active')
      .eq('is_active', true),
    supabaseAdmin
      .from('online_services')
      .select('id,agent_price,price,is_active')
      .eq('is_active', true),
    supabaseAdmin.from('afa_settings').select('agent_price,base_price,is_active').eq('id', 1).maybeSingle(),
  ])

  const link = await getActiveSubAgentLink(authUser.id)
  const packageFloors: Record<string, number> = {}
  const serviceFloors: Record<string, number> = {}

  if (link) {
    const [{ data: pkgPrices }, { data: svcPrices }, { data: afaPrice }] = await Promise.all([
      supabaseAdmin
        .from('sub_agent_package_prices')
        .select('package_id,price')
        .eq('parent_agent_id', link.parent_agent_id),
      supabaseAdmin
        .from('sub_agent_service_prices')
        .select('service_id,price')
        .eq('parent_agent_id', link.parent_agent_id),
      supabaseAdmin
        .from('sub_agent_afa_prices')
        .select('price')
        .eq('parent_agent_id', link.parent_agent_id)
        .maybeSingle(),
    ])

    const pkgMap = new Map((pkgPrices || []).map((row) => [row.package_id, Number(row.price)]))
    const svcMap = new Map((svcPrices || []).map((row) => [row.service_id, Number(row.price)]))

    for (const pkg of packages || []) {
      const platform = Number(pkg.agent_price || pkg.selling_price || pkg.cost_price || 0)
      packageFloors[pkg.id] = Math.max(platform, pkgMap.get(pkg.id) ?? platform)
    }
    for (const svc of services || []) {
      const platform = Number(svc.agent_price || svc.price || 0)
      serviceFloors[svc.id] = Math.max(platform, svcMap.get(svc.id) ?? platform)
    }

    const afaPlatform = Number(afa?.agent_price || afa?.base_price || 0)
    const afaFloor = Math.max(afaPlatform, afaPrice?.price != null ? Number(afaPrice.price) : afaPlatform)

    return NextResponse.json({
      success: true,
      data: {
        isSubAgent: true,
        packageFloors,
        serviceFloors,
        afaFloor,
      },
    })
  }

  for (const pkg of packages || []) {
    packageFloors[pkg.id] = Number(pkg.agent_price || pkg.selling_price || pkg.cost_price || 0)
  }
  for (const svc of services || []) {
    serviceFloors[svc.id] = Number(svc.agent_price || svc.price || 0)
  }

  return NextResponse.json({
    success: true,
    data: {
      isSubAgent: false,
      packageFloors,
      serviceFloors,
      afaFloor: Number(afa?.agent_price || afa?.base_price || 0),
    },
  })
}

/** Parent agent wholesale catalog editor payload */
export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return jsonError('Please login again', 401)

  const recruit = await assertCanRecruitSubAgents(authUser.id)
  if (!recruit.ok) return jsonError(recruit.error, 403)

  const body = (await request.json().catch(() => ({}))) as {
    packages?: Array<{ packageId: string; price: number }>
    services?: Array<{ serviceId: string; price: number }>
    afaPrice?: number | null
  }

  const parentId = authUser.id

  if (body.packages?.length) {
    for (const row of body.packages) {
      const { data: pkg } = await supabaseAdmin
        .from('data_packages')
        .select('id,agent_price,selling_price')
        .eq('id', row.packageId)
        .maybeSingle()
      if (!pkg) continue
      const floor = Number(pkg.agent_price || pkg.selling_price || 0)
      const price = Number(row.price)
      if (!Number.isFinite(price) || price < floor) {
        return jsonError(`Package price must be at least GHc ${floor.toFixed(2)}`, 400)
      }
      const { error } = await supabaseAdmin.from('sub_agent_package_prices').upsert(
        {
          parent_agent_id: parentId,
          package_id: row.packageId,
          price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'parent_agent_id,package_id' }
      )
      if (error) return jsonError(error.message, 500)
    }
  }

  if (body.services?.length) {
    for (const row of body.services) {
      const { data: svc } = await supabaseAdmin
        .from('online_services')
        .select('id,agent_price,price')
        .eq('id', row.serviceId)
        .maybeSingle()
      if (!svc) continue
      const floor = Number(svc.agent_price || svc.price || 0)
      const price = Number(row.price)
      if (!Number.isFinite(price) || price < floor) {
        return jsonError(`Service price must be at least GHc ${floor.toFixed(2)}`, 400)
      }
      const { error } = await supabaseAdmin.from('sub_agent_service_prices').upsert(
        {
          parent_agent_id: parentId,
          service_id: row.serviceId,
          price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'parent_agent_id,service_id' }
      )
      if (error) return jsonError(error.message, 500)
    }
  }

  if (body.afaPrice != null) {
    const { data: afa } = await supabaseAdmin
      .from('afa_settings')
      .select('agent_price,base_price')
      .eq('id', 1)
      .maybeSingle()
    const floor = Number(afa?.agent_price || afa?.base_price || 0)
    const price = Number(body.afaPrice)
    if (!Number.isFinite(price) || price < floor) {
      return jsonError(`AFA price must be at least GHc ${floor.toFixed(2)}`, 400)
    }
    const { error } = await supabaseAdmin.from('sub_agent_afa_prices').upsert(
      {
        parent_agent_id: parentId,
        price,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'parent_agent_id' }
    )
    if (error) return jsonError(error.message, 500)
  }

  return NextResponse.json({ success: true })
}
