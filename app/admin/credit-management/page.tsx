'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { getAdminAuthHeaders } from '@/lib/admin/client-auth'
import { ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type UserRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  wallet_balance: number
}

export default function AdminCreditManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await supabase.client.rpc('sync_auth_users_to_profiles_wallets')
      const { data, error } = await supabase.client.rpc('admin_list_users')
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      setUsers(
        ((data as UserRow[] | null) || []).map((row) => ({
          ...row,
          wallet_balance: Number(row.wallet_balance || 0),
        }))
      )
      setLoading(false)
    }
    void load()
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users.slice(0, 12)
    return users
      .filter((user) =>
        [user.full_name, user.email, user.phone].some((value) => (value || '').toLowerCase().includes(query))
      )
      .slice(0, 12)
  }, [search, users])

  const selectedUser = users.find((user) => user.id === selectedUserId)

  const creditWallet = async () => {
    if (!selectedUserId) {
      toast.error('Select a user first')
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount greater than zero')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/admin/wallets/credit', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUserId,
          amount: parsedAmount,
          note: note.trim() || undefined,
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: { balanceAfter?: number } }
        | null

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to credit wallet')
      }

      toast.success(`Wallet credited. New balance: ${ghanaCurrency(result.data?.balanceAfter || 0)}`)
      setAmount('')
      setNote('')

      const { data } = await supabase.client.rpc('admin_list_users')
      setUsers(
        ((data as UserRow[] | null) || []).map((row) => ({
          ...row,
          wallet_balance: Number(row.wallet_balance || 0),
        }))
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to credit wallet')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Wallet Operations</p>
        <h1 className="mt-2 text-2xl font-black">Credit Management</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-white/55">
          Credit agent and customer wallets directly from the admin console.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-gray-200 shadow-sm dark:border-white/8">
          <CardHeader>
            <CardTitle className="text-base">Find User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or phone"
                className="pl-10"
              />
            </div>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-500">Loading users...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No users found.</p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      selectedUserId === user.id
                        ? 'border-amber-400/40 bg-amber-400/10'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-white/8 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{user.full_name || user.email || 'Unnamed user'}</p>
                      <p className="text-xs text-gray-500">{user.email || user.phone || user.id}</p>
                    </div>
                    <p className="text-sm font-bold">{ghanaCurrency(user.wallet_balance)}</p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm dark:border-white/8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-amber-500" />
              Credit Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedUser ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-white/8 dark:bg-white/[0.03]">
                <p className="font-semibold">{selectedUser.full_name || selectedUser.email}</p>
                <p className="text-gray-500">Current balance: {ghanaCurrency(selectedUser.wallet_balance)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a user to credit their wallet.</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GHS)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for credit"
                rows={3}
              />
            </div>

            <Button
              className="w-full rounded-full bg-amber-400 text-black hover:bg-amber-300"
              onClick={() => void creditWallet()}
              disabled={submitting || !selectedUserId}
            >
              {submitting ? 'Processing...' : 'Credit Wallet'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
