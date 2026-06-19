'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw, Search, Store, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { fetchAdminAgents, type AdminAgentRow } from '@/lib/admin/admin-pages-data'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'

export default function AdminAgentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AdminAgentRow[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchAdminAgents())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (status !== 'all' && row.status !== status) return false
      if (!q) return true
      return (
        (row.full_name || '').toLowerCase().includes(q) ||
        (row.email || '').toLowerCase().includes(q) ||
        (row.phone || '').toLowerCase().includes(q) ||
        (row.storeName || '').toLowerCase().includes(q)
      )
    })
  }, [rows, search, status])

  const activeStores = rows.filter((r) => r.isActive).length

  return (
    <AdminPageShell
      title="Agents"
      description="Manage agent accounts, store status, and wallet balances across the platform."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Agents" value={String(rows.length)} icon={Users} />
          <AdminStatCard label="Active Stores" value={String(activeStores)} icon={Store} />
          <AdminStatCard
            label="Suspended"
            value={String(rows.filter((r) => r.status === 'suspended').length)}
            hint="Agents with suspended status"
          />
          <AdminStatCard
            label="Total Wallet Balance"
            value={ghanaCurrency(rows.reduce((s, r) => s + r.wallet_balance, 0))}
            icon={Wallet}
          />
        </AdminStatGrid>
      }
    >
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, or store..."
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0a0a0f] dark:text-white"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <FlashPageLoader />
      ) : (
        <AdminPanel title="Agent Directory" description={`${filtered.length} agent(s) shown`}>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">Agent</th>
                  <th className="pb-3 pr-4">Store</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Wallet</th>
                  <th className="pb-3 pr-4">Store Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No agents found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-gray-900 dark:text-white">{row.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-gray-500 dark:text-white/50">{row.email || row.phone || '-'}</p>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-white/80">
                        {row.storeName || '-'}
                        {row.isActive != null ? (
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50'
                            }`}
                          >
                            {row.isActive ? 'Live' : 'Off'}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.status === 'active'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">
                        {ghanaCurrency(row.wallet_balance)}
                      </td>
                      <td className="py-3 pr-4">
                        {row.storeSlug ? (
                          <Link
                            href={`/store/${row.storeSlug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-500"
                          >
                            /store/{row.storeSlug}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">No store</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </AdminPageShell>
  )
}
