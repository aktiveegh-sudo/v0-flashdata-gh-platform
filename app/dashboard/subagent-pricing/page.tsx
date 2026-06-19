'use client'

import { useEffect, useState } from 'react'
import { Percent, Save, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function SubAgentPricingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [subAgents, setSubAgents] = useState<SubAgentRow[]>([])
  const [rates, setRates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSubAgents = async (uid: string) => {
    const rows = await fetchSubAgents(uid)
    setSubAgents(rows)
    const nextRates: Record<string, string> = {}
    for (const row of rows) {
      nextRates[row.id] = String(row.commission_rate)
    }
    setRates(nextRates)
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

  const handleSave = async (subAgentId: string) => {
    if (!userId) return

    const parsed = Number(rates[subAgentId])
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error('Commission must be between 0 and 100')
      return
    }

    setSavingId(subAgentId)

    const { error: updateError } = await supabase.client
      .from('sub_agents')
      .update({ commission_rate: parsed })
      .eq('id', subAgentId)
      .eq('parent_agent_id', userId)

    setSavingId(null)

    if (updateError) {
      toast.error(updateError.message)
      return
    }

    toast.success('Commission rate updated')
    await loadSubAgents(userId)
  }

  const activeCount = subAgents.filter((row) => row.status === 'active').length
  const avgRate =
    subAgents.length > 0
      ? (subAgents.reduce((sum, row) => sum + Number(row.commission_rate), 0) / subAgents.length).toFixed(1)
      : '0'

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Sub-Agent Pricing" description="Set commission rates for your sub-agents.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Sub-Agent Pricing"
      description="Configure wholesale commission rates for each sub-agent under your account."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Sub-Agents" value={String(subAgents.length)} icon={Users} />
          <DashboardStatCard label="Active" value={String(activeCount)} icon={Percent} />
          <DashboardStatCard label="Avg Rate" value={`${avgRate}%`} hint="Commission" />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Commission Rates" description="Percentage earned by sub-agents on each sale.">
        {subAgents.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">
            No sub-agents yet. Add sub-agents from the Sub-Agents page first.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/45">
                  <th className="pb-3 pr-4 font-semibold">Sub-Agent</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Rate (%)</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {subAgents.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/[0.03]">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {row.profiles?.full_name || 'Agent'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-white/45">
                        {row.profiles?.email || row.profiles?.phone || row.user_id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant="secondary"
                        className={
                          row.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : row.status === 'suspended'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : ''
                        }
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={rates[row.id] ?? String(row.commission_rate)}
                        onChange={(e) => setRates((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        className="max-w-[100px]"
                      />
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={savingId === row.id}
                        onClick={() => void handleSave(row.id)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
  )
}
