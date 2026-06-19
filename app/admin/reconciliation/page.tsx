'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'

type ReconRow = {
  userId: string
  name: string
  walletBalance: number
  txCredits: number
  txDebits: number
  netTx: number
  variance: number
}

export default function AdminReconciliationPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ReconRow[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [walletsRes, txRes, usersRes] = await Promise.all([
        supabase.client.from('wallets').select('user_id,balance'),
        supabase.client.from('transactions').select('user_id,amount,type,status').eq('status', 'success'),
        supabase.client.rpc('admin_list_users'),
      ])

      if (walletsRes.error) throw new Error(walletsRes.error.message)

      const users = (usersRes.data as Array<{ id: string; full_name: string | null; email: string | null }>) || []
      const nameById = new Map(users.map((u) => [u.id, u.full_name || u.email || 'User']))

      const txByUser = new Map<string, { credits: number; debits: number }>()
      for (const tx of txRes.data || []) {
        const entry = txByUser.get(tx.user_id) || { credits: 0, debits: 0 }
        const amount = Number(tx.amount || 0)
        if (tx.type === 'credit' || tx.type === 'topup' || tx.type === 'refund') {
          entry.credits += amount
        } else {
          entry.debits += amount
        }
        txByUser.set(tx.user_id, entry)
      }

      const recon: ReconRow[] = (walletsRes.data || []).map((w) => {
        const tx = txByUser.get(w.user_id) || { credits: 0, debits: 0 }
        const netTx = tx.credits - tx.debits
        const balance = Number(w.balance || 0)
        return {
          userId: w.user_id,
          name: nameById.get(w.user_id) || 'User',
          walletBalance: balance,
          txCredits: tx.credits,
          txDebits: tx.debits,
          netTx,
          variance: balance - netTx,
        }
      })

      setRows(recon.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 50))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const mismatches = rows.filter((r) => Math.abs(r.variance) > 0.01).length

  return (
    <AdminPageShell
      title="Reconciliation"
      description="Compare wallet balances against successful transaction net flows."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Wallets Checked" value={String(rows.length)} icon={Scale} />
          <AdminStatCard label="Mismatches" value={String(mismatches)} icon={AlertTriangle} />
          <AdminStatCard label="Balanced" value={String(rows.length - mismatches)} icon={CheckCircle} />
          <AdminStatCard
            label="Total Wallet Balance"
            value={ghanaCurrency(rows.reduce((s, r) => s + r.walletBalance, 0))}
          />
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
        <AdminPanel title="Wallet vs Transactions" description="Variance = wallet balance − net transaction flow">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
                <tr>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Wallet</th>
                  <th className="pb-3 pr-4">Credits</th>
                  <th className="pb-3 pr-4">Debits</th>
                  <th className="pb-3 pr-4">Net Tx</th>
                  <th className="pb-3 pr-4">Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500 dark:text-white/50">
                      No wallet data found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.userId} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">{row.name}</td>
                      <td className="py-3 pr-4">{ghanaCurrency(row.walletBalance)}</td>
                      <td className="py-3 pr-4 text-green-600 dark:text-green-400">{ghanaCurrency(row.txCredits)}</td>
                      <td className="py-3 pr-4 text-red-600 dark:text-red-400">{ghanaCurrency(row.txDebits)}</td>
                      <td className="py-3 pr-4">{ghanaCurrency(row.netTx)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`font-semibold ${
                            Math.abs(row.variance) > 0.01
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {ghanaCurrency(row.variance)}
                        </span>
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
