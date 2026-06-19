'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, UserPlus, Users } from 'lucide-react'
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
import { fetchSubAgents, type SubAgentRow } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function SubAgentsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [subAgents, setSubAgents] = useState<SubAgentRow[]>([])
  const [lookup, setLookup] = useState('')
  const [commission, setCommission] = useState('5')
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

    const parsedCommission = Number(commission)
    if (!Number.isFinite(parsedCommission) || parsedCommission < 0 || parsedCommission > 100) {
      toast.error('Commission must be between 0 and 100')
      return
    }

    setAdding(true)

    try {
      const targetUserId = await resolveUserId(lookup)
      if (!targetUserId) {
        toast.error('Agent not found. Enter a valid email, phone, or user ID.')
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
        commission_rate: parsedCommission,
        status: 'pending',
      })

      if (insertError) {
        toast.error(insertError.message.includes('duplicate') ? 'This agent is already linked' : insertError.message)
        setAdding(false)
        return
      }

      toast.success('Sub-agent added successfully')
      setLookup('')
      setCommission('5')
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
    <DashboardPageShell
      title="Sub-Agents"
      description="Recruit sub-agents, set commissions, and track their status."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Total" value={String(subAgents.length)} icon={Users} />
          <DashboardStatCard label="Active" value={String(activeCount)} icon={UserPlus} />
          <DashboardStatCard label="Pending" value={String(pendingCount)} hint="Awaiting approval" />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Add Sub-Agent">
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="lookup">Email, Phone, or User ID</Label>
            <Input
              id="lookup"
              placeholder="agent@email.com or paste user UUID"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission">Commission %</Label>
            <Input
              id="commission"
              type="number"
              min={0}
              max={100}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </div>
          <Button
            onClick={() => void handleAdd()}
            disabled={adding || !lookup.trim()}
            className="gap-2 bg-amber-400 text-black hover:bg-amber-300"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Your Sub-Agents" description="Manage commission and activation status.">
        {subAgents.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">
            No sub-agents yet. Add an agent by email, phone, or user ID above.
          </p>
        ) : (
          <div className="space-y-3">
            {subAgents.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {row.profiles?.full_name || 'Agent'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-white/45">
                    {row.profiles?.email || row.profiles?.phone || row.user_id}
                  </p>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {row.commission_rate}% commission
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      row.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : row.status === 'suspended'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }
                  >
                    {row.status}
                  </Badge>
                  {row.status !== 'active' ? (
                    <Button size="sm" variant="outline" onClick={() => void handleStatusUpdate(row.id, 'active')}>
                      Activate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void handleStatusUpdate(row.id, 'suspended')}>
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
  )
}
