'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Package,
  RefreshCw,
  ShoppingCart,
  Store,
  Trash2,
  AlertCircle,
  Wallet,
  Receipt,
  Banknote,
} from 'lucide-react'
import { AdminPageShell, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime, ghanaCurrency } from '@/lib/admin/utils'
import { getAdminAuthHeaders } from '@/lib/admin/client-auth'
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

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: 'user' | 'super_admin'
  status: 'active' | 'suspended'
  created_at: string
}

type WalletInfo = {
  balance: number
  last_updated: string | null
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

type DataOrder = {
  id: string
  phone: string
  amount: number
  status: string
  reference: string | null
  created_at: string
  data_packages?: { name: string; network: string; amount: string } | Array<{ name: string; network: string; amount: string }> | null
}

type StoreOrder = {
  id: string
  item_type: 'data' | 'service'
  customer_name: string
  customer_phone?: string
  total_price: number
  status: string
  created_at: string
  data_packages?: { name: string; network: string; amount: string } | null
  online_services?: { name: string; category: string } | null
}

type Withdrawal = {
  id: string
  amount: number
  payment_method: string
  account_number: string
  account_name: string
  status: string
  requested_at?: string
  created_at: string
}

type StoreInfo = {
  id: string
  slug: string
  brand_name: string
  tagline?: string | null
  description?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  whatsapp_number?: string | null
  allow_data?: boolean
  allow_online_services?: boolean
  is_active?: boolean
}

type StorePackage = {
  id: string
  selling_price: number
  is_active: boolean
  data_packages?: { name: string; network: string; amount: string; validity?: string } | null
}

type StoreService = {
  id: string
  selling_price: number
  is_active: boolean
  online_services?: { name: string; category: string } | null
}

type AfaRow = {
  id: string
  phone: string
  full_name: string
  status: string
  amount?: number
  reference?: string | null
  created_at: string
}

type DossierStats = {
  walletBalance: number
  totalSales: number
  totalWithdrawn: number
  totalDataSpend: number
  transactionCount: number
  orderCount: number
  storeOrderCount: number
  storeOrderDelivered: number
  withdrawalCount: number
  packageCount: number
  serviceCount: number
  afaCount: number
  subAgentCount?: number
}

type SubAgentOf = {
  id: string
  status: string
  parent_agent_id: string
  parent?: { id?: string; full_name?: string | null; email?: string | null } | null
}

type ChildSubAgent = {
  id: string
  status: string
  user_id: string
  child?: { id?: string; full_name?: string | null; email?: string | null; phone?: string | null } | null
}

const firstJoin = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

const statusBadge = (status: string) => {
  const value = status.toLowerCase()
  if (['success', 'delivered', 'approved', 'active', 'completed'].includes(value)) return 'default' as const
  if (['failed', 'declined', 'rejected', 'suspended'].includes(value)) return 'destructive' as const
  return 'outline' as const
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [orders, setOrders] = useState<DataOrder[]>([])
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [storePackages, setStorePackages] = useState<StorePackage[]>([])
  const [storeServices, setStoreServices] = useState<StoreService[]>([])
  const [afaRows, setAfaRows] = useState<AfaRow[]>([])
  const [stats, setStats] = useState<DossierStats | null>(null)
  const [subAgentOf, setSubAgentOf] = useState<SubAgentOf | null>(null)
  const [subAgents, setSubAgents] = useState<ChildSubAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [suspendDialog, setSuspendDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [creditDialog, setCreditDialog] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [txFilter, setTxFilter] = useState('')

  const loadUserDetails = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/dossier`, {
        headers: await getAdminAuthHeaders(false),
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as {
        success?: boolean
        error?: string
        data?: {
          profile: Profile
          wallet: WalletInfo | null
          store: StoreInfo | null
          transactions: Transaction[]
          orders: DataOrder[]
          storeOrders: StoreOrder[]
          withdrawals: Withdrawal[]
          storePackages: StorePackage[]
          storeServices: StoreService[]
          afaRegistrations: AfaRow[]
          stats: DossierStats
          subAgentOf?: SubAgentOf | null
          subAgents?: ChildSubAgent[]
        }
      } | null

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Failed to load user dashboard')
      }

      setProfile(payload.data.profile)
      setWallet(payload.data.wallet)
      setStore(payload.data.store)
      setTransactions(payload.data.transactions || [])
      setOrders(payload.data.orders || [])
      setStoreOrders(payload.data.storeOrders || [])
      setWithdrawals(payload.data.withdrawals || [])
      setStorePackages(payload.data.storePackages || [])
      setStoreServices(payload.data.storeServices || [])
      setAfaRows(payload.data.afaRegistrations || [])
      setStats(payload.data.stats)
      setSubAgentOf(payload.data.subAgentOf || null)
      setSubAgents(payload.data.subAgents || [])
    } catch (error) {
      console.error('Error loading user details:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load user details')
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadUserDetails()
  }, [loadUserDetails])

  const filteredTransactions = useMemo(() => {
    const q = txFilter.trim().toLowerCase()
    if (!q) return transactions
    return transactions.filter((tx) =>
      [tx.type, tx.status, tx.reference, tx.description || ''].join(' ').toLowerCase().includes(q)
    )
  }, [transactions, txFilter])

  const handleSuspend = async () => {
    if (!profile) return
    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        body: JSON.stringify({
          userId,
          action: profile.status === 'active' ? 'suspend' : 'activate',
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update user status')
      }

      toast.success(`User ${profile.status === 'active' ? 'suspended' : 'activated'} successfully`)
      setSuspendDialog(false)
      await loadUserDetails()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreditWallet = async () => {
    if (!profile) return

    const amount = Number.parseFloat(creditAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid amount greater than zero')
      return
    }

    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/wallets/credit', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        credentials: 'include',
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

      toast.success(`Wallet credited. New balance: ${ghanaCurrency(result.data?.balanceAfter || 0)}`)
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
    if (!profile) return
    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/users/action', {
        method: 'POST',
        headers: await getAdminAuthHeaders(),
        body: JSON.stringify({ userId, action: 'delete' }),
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
      <AdminPageShell title="User Dashboard" description="Loading full account activity.">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-center text-sm text-muted-foreground">Loading user dashboard...</div>
      </AdminPageShell>
    )
  }

  if (!profile) {
    return (
      <AdminPageShell title="User Dashboard" description="User profile and activity.">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="text-center text-destructive">User not found</div>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title={profile.full_name || profile.email || 'User Dashboard'}
      description={`Full account view · ${profile.email || 'No email'} · ${profile.role} · ${profile.status}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Users
          </Button>
          <Button variant="outline" size="sm" onClick={() => void loadUserDetails()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            variant={profile.status === 'active' ? 'outline' : 'default'}
            size="sm"
            onClick={() => setSuspendDialog(true)}
            disabled={actionLoading}
          >
            {profile.status === 'active' ? 'Suspend' : 'Activate'}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)} disabled={actionLoading}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Wallet Balance" value={ghanaCurrency(stats?.walletBalance || 0)} icon={Wallet} />
          <AdminStatCard label="Store Sales" value={ghanaCurrency(stats?.totalSales || 0)} icon={ShoppingCart} />
          <AdminStatCard label="Data Spend" value={ghanaCurrency(stats?.totalDataSpend || 0)} icon={Package} />
          <AdminStatCard label="Withdrawn" value={ghanaCurrency(stats?.totalWithdrawn || 0)} icon={Banknote} />
        </AdminStatGrid>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f] lg:col-span-2">
          <CardHeader>
            <CardTitle>Account Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{profile.full_name || 'No name'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg">{profile.email || 'No email'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="text-lg">{profile.phone || 'No phone'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="break-all font-mono text-xs">{profile.id}</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge>{profile.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={profile.status === 'active' ? 'default' : 'destructive'}>{profile.status}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joined</p>
              <p className="text-sm">{formatDateTime(profile.created_at)}</p>
            </div>
            {subAgentOf ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Sub-agent of</p>
                <Link
                  href={`/admin/users/${subAgentOf.parent_agent_id}`}
                  className="mt-1 inline-block font-semibold hover:underline"
                >
                  {firstJoin(subAgentOf.parent)?.full_name || 'Parent agent'}
                </Link>
                <p className="text-xs text-muted-foreground capitalize">Status: {subAgentOf.status}</p>
              </div>
            ) : null}
            {subAgents.length > 0 ? (
              <div className="rounded-xl border p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Subagents ({subAgents.length})
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {subAgents.slice(0, 8).map((row) => {
                    const child = firstJoin(row.child)
                    return (
                      <li key={row.id}>
                        <Link href={`/admin/users/${row.user_id}`} className="hover:underline">
                          {child?.full_name || row.user_id.slice(0, 8)}
                        </Link>
                        <span className="ml-2 text-xs capitalize text-muted-foreground">{row.status}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
          <CardHeader>
            <CardTitle>Wallet & Store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-3xl font-black">{wallet ? ghanaCurrency(wallet.balance) : 'N/A'}</p>
              {wallet?.last_updated ? (
                <p className="text-xs text-muted-foreground">Updated: {formatDateTime(wallet.last_updated)}</p>
              ) : null}
              <Button
                className="mt-3"
                size="sm"
                onClick={() => {
                  setCreditAmount('')
                  setCreditNote('')
                  setCreditDialog(true)
                }}
                disabled={actionLoading || profile.status === 'suspended'}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Credit Wallet
              </Button>
            </div>

            {store ? (
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <Store className="h-4 w-4" />
                      {store.brand_name}
                    </p>
                    <p className="text-xs text-muted-foreground">/{store.slug}</p>
                  </div>
                  <Badge variant={store.is_active ? 'default' : 'outline'}>{store.is_active ? 'Live' : 'Off'}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>WhatsApp: {store.whatsapp_number || store.contact_phone || '—'}</p>
                  <p>Data packages: {stats?.packageCount || 0} · Services: {stats?.serviceCount || 0}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/store/${store.slug}`} target="_blank">
                    Open storefront <ExternalLink className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No agent store created.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="transactions">Transactions ({stats?.transactionCount || 0})</TabsTrigger>
          <TabsTrigger value="orders">Data Orders ({stats?.orderCount || 0})</TabsTrigger>
          <TabsTrigger value="store-orders">Store Orders ({stats?.storeOrderCount || 0})</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals ({stats?.withdrawalCount || 0})</TabsTrigger>
          <TabsTrigger value="store-catalog">Store Catalog</TabsTrigger>
          <TabsTrigger value="afa">AFA ({stats?.afaCount || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> All Transactions
              </CardTitle>
              <Input
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value)}
                placeholder="Filter by type, status, reference..."
                className="max-w-xs"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions found.</p>
              ) : (
                filteredTransactions.map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">{tx.description || tx.reference}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{ghanaCurrency(tx.amount)}</p>
                        <Badge variant={statusBadge(tx.status)} className="text-xs">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
            <CardHeader>
              <CardTitle>Agent Data Purchases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data orders found.</p>
              ) : (
                orders.map((order) => {
                  const pkg = firstJoin(order.data_packages)
                  return (
                    <div key={order.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {pkg ? `${pkg.amount} ${pkg.network} — ${pkg.name}` : 'Data order'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            To {order.phone} · {order.reference || order.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{ghanaCurrency(order.amount)}</p>
                          <Badge variant={statusBadge(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store-orders">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
            <CardHeader>
              <CardTitle>Customer Store Orders ({stats?.storeOrderDelivered || 0} delivered)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {storeOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No store orders found.</p>
              ) : (
                storeOrders.map((order) => {
                  const pkg = firstJoin(order.data_packages)
                  const service = firstJoin(order.online_services)
                  const label =
                    order.item_type === 'service'
                      ? service?.name || 'Service'
                      : pkg
                        ? `${pkg.amount} ${pkg.network}`
                        : 'Data'
                  return (
                    <div key={order.id} className="rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">
                            {label} · {order.customer_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.customer_phone || 'No phone'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{ghanaCurrency(order.total_price)}</p>
                          <Badge variant={statusBadge(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawals found.</p>
              ) : (
                withdrawals.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {row.account_name} · {row.payment_method}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.account_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{ghanaCurrency(row.amount)}</p>
                        <Badge variant={statusBadge(row.status)} className="text-xs">
                          {row.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(row.requested_at || row.created_at)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store-catalog">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
              <CardHeader>
                <CardTitle>Store Packages ({storePackages.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {storePackages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No packages published.</p>
                ) : (
                  storePackages.map((row) => {
                    const pkg = firstJoin(row.data_packages)
                    return (
                      <div key={row.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="text-sm font-medium">
                            {pkg ? `${pkg.amount} ${pkg.network}` : 'Package'}
                          </p>
                          <p className="text-xs text-muted-foreground">{pkg?.name || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{ghanaCurrency(Number(row.selling_price || 0))}</p>
                          <Badge variant={row.is_active ? 'default' : 'outline'} className="text-xs">
                            {row.is_active ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
              <CardHeader>
                <CardTitle>Store Services ({storeServices.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {storeServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services published.</p>
                ) : (
                  storeServices.map((row) => {
                    const service = firstJoin(row.online_services)
                    return (
                      <div key={row.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="text-sm font-medium">{service?.name || 'Service'}</p>
                          <p className="text-xs text-muted-foreground">{service?.category || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{ghanaCurrency(Number(row.selling_price || 0))}</p>
                          <Badge variant={row.is_active ? 'default' : 'outline'} className="text-xs">
                            {row.is_active ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="afa">
          <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
            <CardHeader>
              <CardTitle>AFA Registrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {afaRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AFA registrations found.</p>
              ) : (
                afaRows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.phone} · {row.reference || row.id}
                        </p>
                      </div>
                      <div className="text-right">
                        {row.amount != null ? <p className="font-semibold">{ghanaCurrency(Number(row.amount || 0))}</p> : null}
                        <Badge variant={statusBadge(row.status)} className="text-xs">
                          {row.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={creditDialog} onOpenChange={setCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Wallet</DialogTitle>
            <DialogDescription>
              Add funds to {profile.full_name || 'this user'}&apos;s wallet. The credit is recorded in transactions.
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
            <AlertDialogTitle>{profile.status === 'active' ? 'Suspend User?' : 'Activate User?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {profile.status === 'active'
                ? 'This user will no longer be able to access their account.'
                : 'This user will be able to access their account again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">{profile.full_name || 'This user'}</p>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleSuspend()} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700">
              {actionLoading ? 'Processing...' : profile.status === 'active' ? 'Suspend' : 'Activate'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user account and associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-800">{profile.full_name || 'This user'}</p>
          </div>
          <div className="flex gap-2">
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  )
}
