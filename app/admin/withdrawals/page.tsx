'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AdminPageShell } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type WithdrawalRow = {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  payment_method: string
  account_number: string
  account_name: string
  created_at: string
  processed_at: string | null
  profiles?: { full_name: string | null; phone: string | null } | null
}

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRows = async () => {
    setLoading(true)
    const { data, error } = await supabase.client
      .from('withdrawals')
      .select('id,user_id,amount,status,payment_method,account_number,account_name,created_at,processed_at,profiles(full_name,phone)')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setRows((data as WithdrawalRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadRows()

    const channel = supabase.client
      .channel('admin-withdrawals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => void loadRows())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const approveWithdrawal = async (row: WithdrawalRow) => {
    setBusyId(row.id)

    const { data: wallet, error: walletError } = await supabase.client
      .from('wallets')
      .select('id,balance')
      .eq('user_id', row.user_id)
      .single()

    if (walletError || !wallet) {
      toast.error(walletError?.message || 'Wallet not found')
      setBusyId(null)
      return
    }

    const current = Number(wallet.balance || 0)
    const amount = Number(row.amount || 0)

    if (current < amount) {
      toast.error('Insufficient wallet balance for this user')
      setBusyId(null)
      return
    }

    const { error: walletUpdateError } = await supabase.client
      .from('wallets')
      .update({
        balance: Number((current - amount).toFixed(2)),
        last_updated: new Date().toISOString(),
      })
      .eq('id', wallet.id)

    if (walletUpdateError) {
      toast.error(walletUpdateError.message)
      setBusyId(null)
      return
    }

    const { error: withdrawalError } = await supabase.client
      .from('withdrawals')
      .update({ status: 'approved', processed_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'pending')

    if (withdrawalError) {
      toast.error(withdrawalError.message)
      setBusyId(null)
      return
    }

    const { error: txError } = await supabase.client.from('transactions').insert({
      user_id: row.user_id,
      type: 'withdrawal',
      amount: amount,
      status: 'success',
      description: `Withdrawal approved (${row.payment_method} ${row.account_number})`,
      reference: `WDR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })

    if (txError) {
      toast.error(`Approved, but transaction log failed: ${txError.message}`)
    } else {
      toast.success('Withdrawal approved and wallet debited')
    }

    setBusyId(null)
    void loadRows()
  }

  const rejectWithdrawal = async (row: WithdrawalRow) => {
    setBusyId(row.id)

    const { error } = await supabase.client
      .from('withdrawals')
      .update({ status: 'rejected', processed_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'pending')

    if (error) {
      toast.error(error.message)
      setBusyId(null)
      return
    }

    toast.success('Withdrawal rejected')
    setBusyId(null)
    void loadRows()
  }

  return (
    <AdminPageShell
      title="Withdrawals"
      description="Approve or reject requests with wallet deduction logic on approval."
    >
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Payout Details</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Requested</th>
                <th className="px-3 py-3">Processed</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={7}>Loading withdrawals...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={7}>No requests found.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{row.profiles?.phone || '-'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{row.payment_method}</p>
                    <p className="text-xs text-muted-foreground">{row.account_name} ({row.account_number})</p>
                  </td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(row.amount || 0))}</td>
                  <td className="px-3 py-3">
                    <Badge variant={row.status === 'approved' ? 'default' : row.status === 'pending' ? 'secondary' : 'destructive'}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(row.created_at)}</td>
                  <td className="px-3 py-3">{row.processed_at ? formatDateTime(row.processed_at) : '-'}</td>
                  <td className="px-3 py-3">
                    {row.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => void approveWithdrawal(row)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === row.id}
                          onClick={() => void rejectWithdrawal(row)}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
