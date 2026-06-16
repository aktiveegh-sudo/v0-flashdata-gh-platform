'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Trash2, AlertCircle, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type UserDetail = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: 'user' | 'super_admin'
  status: 'active' | 'suspended'
  avatar_url: string | null
  created_at: string
}

type WalletInfo = {
  balance: number
  last_updated: string
}

type Transaction = {
  id: string
  type: string
  amount: number
  status: string
  reference: string
  description: string | null
  created_at: string
}

type StoreOrder = {
  id: string
  item_type: 'data' | 'service'
  customer_name: string
  total_price: number
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  created_at: string
}

type Store = {
  id: string
  slug: string
  brand_name: string
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([])
  const [sales, setSales] = useState<Transaction[]>([])
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [suspendDialog, setSuspendDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [creditDialog, setCreditDialog] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')

  useEffect(() => {
    if (!userId) return
    loadUserDetails()
  }, [userId])

  const loadUserDetails = async () => {
    if (!userId) return
    setLoading(true)

    try {
      await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)
      const [userRes, walletRes, transactionsRes, storeOrdersRes, salesRes, storeRes] = await Promise.all([
        supabase.client.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.client.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.client
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.client
          .from('agent_store_orders')
          .select('id,item_type,customer_name,total_price,status,created_at')
          .eq('store_id', (await supabase.client.from('agent_stores').select('id').eq('agent_id', userId).maybeSingle()).data?.id || '')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.client
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('type', 'store_sale')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.client.from('agent_stores').select('*').eq('agent_id', userId).maybeSingle(),
      ])

      if (userRes.data) setUser(userRes.data as UserDetail)
      if (walletRes.data)
        setWallet({
          balance: Number(walletRes.data.balance || 0),
          last_updated: walletRes.data.last_updated,
        })
      if (transactionsRes.data)
        setTransactions(
          (transactionsRes.data as any[]).map((t) => ({
            ...t,
            amount: Number(t.amount || 0),
          }))
        )
      if (storeOrdersRes.data)
        setStoreOrders(
          (storeOrdersRes.data as any[]).map((o) => ({
            ...o,
            total_price: Number(o.total_price || 0),
          }))
        )
      if (salesRes.data)
        setSales(
          (salesRes.data as any[]).map((s) => ({
            ...s,
            amount: Number(s.amount || 0),
          }))
        )
      if (storeRes.data) setStore(storeRes.data as Store)
    } catch (error) {
      console.error('Error loading user details:', error)
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!user) return
    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: user.status === 'active' ? 'suspend' : 'activate',
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update user status')
      }

      toast.success(`User ${user.status === 'active' ? 'suspended' : 'activated'} successfully`)
      setSuspendDialog(false)
      await loadUserDetails()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreditWallet = async () => {
    if (!user) return

    const amount = Number.parseFloat(creditAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount greater than zero')
      return
    }

    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/wallets/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
          note: creditNote.trim() || undefined,
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: { balanceAfter?: number } }
        | null

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to credit wallet')
      }

      toast.success(`Wallet credited successfully. New balance: ${ghanaCurrency(result.data?.balanceAfter || 0)}`)
      setCreditDialog(false)
      setCreditAmount('')
      setCreditNote('')
      await loadUserDetails()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: 'delete',
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete user')
      }

      toast.success('User deleted successfully')
      setDeleteDialog(false)
      router.push('/admin/users')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-center">Loading user details...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-center text-destructive">User not found</div>
      </div>
    )
  }

  const totalSales = sales.reduce((acc, s) => acc + s.amount, 0)
  const totalStoreOrders = storeOrders.length
  const completedOrders = storeOrders.filter((o) => o.status === 'completed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={user.status === 'active' ? 'outline' : 'default'}
            size="sm"
            onClick={() => setSuspendDialog(true)}
            disabled={actionLoading}
          >
            {user.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)} disabled={actionLoading}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{user.full_name || 'No name'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg">{user.email || 'No email'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p className="text-lg">{user.phone || 'No phone'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <Badge>{user.role}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>{user.status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Joined</p>
              <p className="text-sm">{formatDateTime(user.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet & Store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
              <p className="text-2xl font-bold">{wallet ? ghanaCurrency(wallet.balance) : 'N/A'}</p>
              {wallet && <p className="text-xs text-muted-foreground">Updated: {formatDateTime(wallet.last_updated)}</p>}
              <Button
                className="mt-3"
                size="sm"
                onClick={() => {
                  setCreditAmount('')
                  setCreditNote('')
                  setCreditDialog(true)
                }}
                disabled={actionLoading || user.status === 'suspended'}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Credit Wallet
              </Button>
            </div>
            {store ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Store</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{store.brand_name}</span>
                  <a
                    href={`/store/${store.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-1">/{store.slug}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Store</p>
                <p className="text-sm text-muted-foreground">No store created</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ghanaCurrency(totalSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">From {sales.length} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Store Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalStoreOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">{completedOrders} completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total activity</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions found.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{tx.description || tx.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{ghanaCurrency(tx.amount)}</p>
                    <Badge variant={tx.status === 'success' ? 'default' : 'outline'} className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{formatDateTime(tx.created_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Store Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {storeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No store orders found.</p>
          ) : (
            storeOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {order.item_type === 'data' ? 'Data' : 'Service'} - {order.customer_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{ghanaCurrency(order.total_price)}</p>
                    <Badge
                      variant={
                        order.status === 'completed'
                          ? 'default'
                          : order.status === 'declined'
                            ? 'destructive'
                            : 'outline'
                      }
                      className="text-xs"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{formatDateTime(order.created_at)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={creditDialog} onOpenChange={setCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Wallet</DialogTitle>
            <DialogDescription>
              Add funds to {user.full_name || 'this user'}&apos;s wallet. The credit is recorded in transactions and wallet ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Current balance</p>
              <p className="text-lg font-semibold">{wallet ? ghanaCurrency(wallet.balance) : 'N/A'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-amount">Amount (GHS)</Label>
              <Input
                id="credit-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit-note">Note (optional)</Label>
              <Textarea
                id="credit-note"
                placeholder="Reason for credit, promo, manual top-up, etc."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreditWallet()} disabled={actionLoading || !creditAmount}>
              {actionLoading ? 'Crediting...' : 'Credit Wallet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{user.status === 'active' ? 'Suspend User?' : 'Activate User?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {user.status === 'active'
                ? 'This user will no longer be able to access their account.'
                : 'This user will be able to access their account again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">{user.full_name || 'This user'}</p>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspend} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700">
              {actionLoading ? 'Processing...' : user.status === 'active' ? 'Suspend' : 'Activate'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The user account and all associated data will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{user.full_name || 'This user'}</p>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
