'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { Badge } from '@/components/ui/badge'
import { getAdminAuthHeaders } from '@/lib/admin/client-auth'
import { formatDateTime } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type ProfileLite = { id?: string; full_name?: string | null; email?: string | null; phone?: string | null }

type SubAgentRow = {
  id: string
  parent_agent_id: string
  user_id: string
  commission_rate: number
  status: string
  created_at: string
  parent?: ProfileLite | ProfileLite[] | null
  child?: ProfileLite | ProfileLite[] | null
}

const asProfile = (value: ProfileLite | ProfileLite[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value || null

export default function AdminSubAgentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SubAgentRow[]>([])
  const [reparentId, setReparentId] = useState<string | null>(null)
  const [newParentId, setNewParentId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/sub-agents', {
        headers: await getAdminAuthHeaders(false),
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: { rows: SubAgentRow[] }
      }
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load sub-agents')
      }
      setRows(payload.data?.rows || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sub-agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const mutate = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/admin/sub-agents', {
      method: 'POST',
      headers: await getAdminAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string }
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Action failed')
    }
  }

  const handleStatus = async (id: string, status: string) => {
    try {
      await mutate({ action: 'update', id, status })
      toast.success(`Marked ${status}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this sub-agent relationship?')) return
    try {
      await mutate({ action: 'delete', id })
      toast.success('Relationship deleted')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleReparent = async () => {
    if (!reparentId || !newParentId.trim()) {
      toast.error('Enter the new parent agent user ID')
      return
    }
    try {
      await mutate({ action: 'reparent', id: reparentId, parentAgentId: newParentId.trim() })
      toast.success('Reparented')
      setReparentId(null)
      setNewParentId('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reparent failed')
    }
  }

  const active = rows.filter((r) => r.status === 'active').length

  return (
    <AdminPageShell
      title="Sub-Agents"
      description="Manage sub-agent relationships, status, and parent links."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Sub-Agents" value={String(rows.length)} icon={Users} />
          <AdminStatCard label="Active" value={String(active)} icon={UserPlus} />
          <AdminStatCard label="Pending" value={String(rows.filter((r) => r.status === 'pending').length)} />
          <AdminStatCard label="Suspended" value={String(rows.filter((r) => r.status === 'suspended').length)} />
        </AdminStatGrid>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : (
        <AdminPanel title="Sub-Agent Directory" description={`${rows.length} relationship(s)`}>
          {reparentId ? (
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border p-3">
              <div className="flex-1">
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">New parent user ID</p>
                <Input value={newParentId} onChange={(e) => setNewParentId(e.target.value)} placeholder="uuid" />
              </div>
              <Button onClick={() => void handleReparent()}>Save parent</Button>
              <Button variant="outline" onClick={() => setReparentId(null)}>
                Cancel
              </Button>
            </div>
          ) : null}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Parent Agent</th>
                  <th className="pb-3 pr-4">Sub-Agent</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No sub-agents found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const parent = asProfile(row.parent)
                    const child = asProfile(row.child)
                    return (
                      <tr key={row.id} className="border-b border-gray-50 dark:border-white/5">
                        <td className="py-3 pr-4">
                          <Link href={`/admin/users/${row.parent_agent_id}`} className="font-semibold hover:underline">
                            {parent?.full_name || 'Parent'}
                          </Link>
                          <p className="text-xs text-gray-500">{parent?.email || row.parent_agent_id}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Link href={`/admin/users/${row.user_id}`} className="font-semibold hover:underline">
                            {child?.full_name || 'Sub-agent'}
                          </Link>
                          <p className="text-xs text-gray-500">{child?.email || child?.phone || row.user_id}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="capitalize">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{formatDateTime(row.created_at)}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {row.status !== 'active' ? (
                              <Button size="sm" variant="outline" onClick={() => void handleStatus(row.id, 'active')}>
                                Activate
                              </Button>
                            ) : null}
                            {row.status !== 'suspended' ? (
                              <Button size="sm" variant="outline" onClick={() => void handleStatus(row.id, 'suspended')}>
                                Suspend
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" onClick={() => setReparentId(row.id)}>
                              Reparent
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void handleDelete(row.id)}>
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
