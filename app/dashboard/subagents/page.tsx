'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Loader2, Plus, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { SubAgentRecruitGate } from '@/components/dashboard/subagent-recruit-gate'
import { fetchAgentStore, fetchSubAgents, type SubAgentRow } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function SubAgentsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [subAgents, setSubAgents] = useState<SubAgentRow[]>([])
  const [inviteUrl, setInviteUrl] = useState('')
  const [lookup, setLookup] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSubAgents = async (uid: string) => {
    const rows = await fetchSubAgents(uid)
    setSubAgents(rows)
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id
      if (!uid) {
        setError('Please login again')
        setLoading(false)
        return
      }

      setUserId(uid)

      try {
        const store = await fetchAgentStore(uid)
        if (store?.slug) {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          setInviteUrl(`${origin}/store/${store.slug}/join`)
        }
        await loadSubAgents(uid)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load sub-agents')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [])

  const resolveUserId = async (value: string): Promise<string | null> => {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (UUID_PATTERN.test(trimmed)) {
      return trimmed
    }

    const isEmail = trimmed.includes('@')
    const query = supabase.client.from('profiles').select('id').limit(1)

    const { data } = isEmail
      ? await query.eq('email', trimmed.toLowerCase()).maybeSingle()
      : await query.eq('phone', trimmed).maybeSingle()

    return data?.id ?? null
  }

  const handleAdd = async () => {
    if (!userId) return

    setAdding(true)

    try {
      const { data: selfCheck } = await supabase.client
        .from('sub_agents')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (selfCheck) {
        toast.error('Subagents cannot recruit other subagents')
        setAdding(false)
        return
      }

      const targetUserId = await resolveUserId(lookup)
      if (!targetUserId) {
        toast.error('User not found. Enter a valid email, phone, or user ID.')
        setAdding(false)
        return
      }

      if (targetUserId === userId) {
        toast.error('You cannot add yourself as a sub-agent')
        setAdding(false)
        return
      }

      const { error: insertError } = await supabase.client.from('sub_agents').insert({
        parent_agent_id: userId,
        user_id: targetUserId,
        commission_rate: 0,
        status: 'active',
      })

      if (insertError) {
        toast.error(insertError.message.includes('duplicate') ? 'This user is already linked' : insertError.message)
        setAdding(false)
        return
      }

      toast.success('Sub-agent linked successfully')
      setLookup('')
      await loadSubAgents(userId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add sub-agent')
    } finally {
      setAdding(false)
    }
  }

  const handleStatusUpdate = async (subAgentId: string, status: string) => {
    if (!userId) return

    const { error: updateError } = await supabase.client
      .from('sub_agents')
      .update({ status })
      .eq('id', subAgentId)
      .eq('parent_agent_id', userId)

    if (updateError) {
      toast.error(updateError.message)
      return
    }

    toast.success(`Sub-agent ${status}`)
    await loadSubAgents(userId)
  }

  const copyInvite = async () => {
    if (!inviteUrl) {
      toast.error('Create your store first to get an invite link')
      return
    }
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Invite link copied')
  }

  const activeCount = subAgents.filter((row) => row.status === 'active').length
  const pendingCount = subAgents.filter((row) => row.status === 'pending').length

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Sub-Agents" description="Recruit and manage agents under your account.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <SubAgentRecruitGate>
    <DashboardPageShell
      title="Sub-Agents"
      description="Share your store invite link so others can join as subagents with their own wallet and store."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Total" value={String(subAgents.length)} icon={Users} />
          <DashboardStatCard label="Active" value={String(activeCount)} icon={UserPlus} />
          <DashboardStatCard label="Pending" value={String(pendingCount)} hint="Awaiting approval" />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Invite link">
        <p className="mb-3 text-sm text-gray-500 dark:text-white/50">
          People open this page on your store, then create an account or sign in to become your subagent.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input readOnly value={inviteUrl || 'Set up My Store to generate an invite link'} className="flex-1" />
          <Button type="button" variant="outline" onClick={() => void copyInvite()} disabled={!inviteUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          {inviteUrl ? (
            <Button asChild className="bg-amber-400 text-black hover:bg-amber-300">
              <Link href={inviteUrl.replace(/^https?:\/\/[^/]+/, '') || '#'}>Open</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/dashboard/store-settings">Store settings</Link>
            </Button>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Set wholesale prices on{' '}
          <Link href="/dashboard/subagent-pricing" className="font-semibold text-amber-600 hover:underline">
            Subagent Pricing
          </Link>
          . View their activity on{' '}
          <Link href="/dashboard/subagent-orders" className="font-semibold text-amber-600 hover:underline">
            Subagent Orders
          </Link>
          .
        </p>
      </DashboardPanel>

      <DashboardPanel title="Link existing user (optional)">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="lookup">Email, Phone, or User ID</Label>
            <Input
              id="lookup"
              placeholder="agent@email.com or paste user UUID"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
            />
          </div>
          <Button
            onClick={() => void handleAdd()}
            disabled={adding || !lookup.trim()}
            className="gap-2 bg-amber-400 text-black hover:bg-amber-300"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Link user
          </Button>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Your subagents">
        {subAgents.length === 0 ? (
          <p className="text-sm text-gray-500">No subagents yet. Share your invite link to get started.</p>
        ) : (
          <div className="space-y-3">
            {subAgents.map((row) => {
              const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 p-4 dark:border-white/8"
                >
                  <div>
                    <p className="font-bold">{profile?.full_name || 'Sub-agent'}</p>
                    <p className="text-xs text-gray-500">
                      {profile?.email || profile?.phone || row.user_id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {row.status}
                    </Badge>
                    {row.status !== 'active' ? (
                      <Button size="sm" variant="outline" onClick={() => void handleStatusUpdate(row.id, 'active')}>
                        Activate
                      </Button>
                    ) : null}
                    {row.status !== 'suspended' ? (
                      <Button size="sm" variant="outline" onClick={() => void handleStatusUpdate(row.id, 'suspended')}>
                        Suspend
                      </Button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
    </SubAgentRecruitGate>
  )
}
