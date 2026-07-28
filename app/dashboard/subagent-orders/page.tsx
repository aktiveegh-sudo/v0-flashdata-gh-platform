'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Loader2 } from 'lucide-react'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { SubAgentRecruitGate } from '@/components/dashboard/subagent-recruit-gate'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'

type SubAgentOrder = {
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

export default function SubAgentOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<SubAgentOrder[]>([])
  const [subagentCount, setSubagentCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) throw new Error('Please login again')

        const response = await fetch('/api/dashboard/subagent-orders', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = (await response.json().catch(() => null)) as {
          success?: boolean
          error?: string
          data?: { orders: SubAgentOrder[]; subagentCount: number }
        }
        if (!response.ok || !result?.success) {
          throw new Error(result?.error || 'Unable to load subagent orders')
        }
        setOrders(result.data?.orders || [])
        setSubagentCount(result.data?.subagentCount || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load orders')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Subagent Orders" description="Orders placed by your subagents.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <SubAgentRecruitGate>
    <DashboardPageShell
      title="Subagent Orders"
      description="Dashboard and store orders from your active subagents."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Active Subagents" value={String(subagentCount)} icon={ClipboardList} />
          <DashboardStatCard label="Recent Orders" value={String(orders.length)} />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Recent activity">
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">No subagent orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-gray-500">
                  <th className="px-2 py-2">When</th>
                  <th className="px-2 py-2">Subagent</th>
                  <th className="px-2 py-2">Item</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={`${order.kind}-${order.id}`} className="border-b border-gray-100 dark:border-white/5">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {format(new Date(order.createdAt), 'dd MMM HH:mm')}
                    </td>
                    <td className="px-2 py-2 font-medium">{order.subagentName}</td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="mr-2 text-[10px] uppercase">
                        {order.kind}
                      </Badge>
                      {order.itemLabel}
                    </td>
                    <td className="px-2 py-2">{order.phone || '—'}</td>
                    <td className="px-2 py-2">GHc {order.amount.toFixed(2)}</td>
                    <td className="px-2 py-2 capitalize">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </DashboardPageShell>
    </SubAgentRecruitGate>
  )
}
