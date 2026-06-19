'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, RotateCw } from 'lucide-react'
import { AdminPageShell } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { getAdminAuthHeaders } from '@/lib/admin/client-auth'
import { formatDateTime, ghanaCurrency, toCsv } from '@/lib/admin/utils'
import { adminStatusOptions, normalizeAdminOrderStatus, type AdminOrderSource } from '@/lib/orders/status'
import toast from 'react-hot-toast'

type DashboardDataOrderRow = {
  id: string
  user_id: string
  phone: string
  amount: number
  status: 'pending' | 'processing' | 'delivered' | 'failed'
  reference: string
  retry_count: number
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
  data_packages?: { network: string; name: string; amount: string } | null
}

type AfaOrderRow = {
  id: string
  user_id: string
  full_name: string
  phone: string
  amount: number
  status: 'pending' | 'processing' | 'delivered' | 'rejected'
  reference: string
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
}

type StoreOrderRow = {
  id: string
  item_type: 'data' | 'service'
  customer_name: string
  customer_phone: string
  customer_email: string | null
  customer_note: string | null
  total_price: number
  status: 'pending' | 'processing' | 'delivered' | 'declined'
  created_at: string
  data_packages?: { network: string; name: string; amount: string } | null
  online_services?: { name: string; category: string } | null
  agent_stores?: { brand_name: string; slug: string } | null
}

type UnifiedOrderRow = {
  id: string
  source: 'dashboard' | 'dashboard_afa' | 'store_data' | 'store_service' | 'store_afa'
  orderType: 'Data' | 'AFA' | 'Service'
  reference: string
  customerName: string
  customerEmail: string
  customerPhone: string
  itemLabel: string
  networkOrCategory: string
  amount: number
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'rejected' | 'declined'
  createdAt: string
  retryCount: number
  retryTargetOrderId: string | null
}

const statusOptions = ['all', 'pending', 'processing', 'delivered', 'failed', 'rejected', 'declined'] as const
type StatusFilter = typeof statusOptions[number]

const statusBadgeVariant = (status: UnifiedOrderRow['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'delivered') return 'default'
  if (status === 'failed' || status === 'rejected' || status === 'declined') return 'destructive'
  if (status === 'processing') return 'outline'
  return 'secondary'
}

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<UnifiedOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)
    const [dashboardDataResult, afaResult, storeResult] = await Promise.all([
      supabase.client
        .from('orders')
        .select('id,user_id,phone,amount,status,reference,retry_count,created_at,profiles(full_name,email),data_packages(network,name,amount)')
        .order('created_at', { ascending: false }),
      supabase.client
        .from('afa_registrations')
        .select('id,user_id,full_name,phone,amount,status,reference,created_at,profiles(full_name,email)')
        .order('created_at', { ascending: false }),
      supabase.client
        .from('agent_store_orders')
        .select('id,item_type,customer_name,customer_phone,customer_email,customer_note,total_price,status,created_at,data_packages(network,name,amount),online_services(name,category),agent_stores(brand_name,slug)')
        .order('created_at', { ascending: false }),
    ])

    if (dashboardDataResult.error) {
      toast.error(dashboardDataResult.error.message)
      setLoading(false)
      return
    }

    if (afaResult.error) {
      toast.error(afaResult.error.message)
      setLoading(false)
      return
    }

    if (storeResult.error) {
      toast.error(storeResult.error.message)
      setLoading(false)
      return
    }

    const dashboardRows: UnifiedOrderRow[] = ((dashboardDataResult.data as DashboardDataOrderRow[] | null) || []).map((row) => ({
      id: row.id,
      source: 'dashboard',
      orderType: 'Data',
      reference: row.reference || row.id,
      customerName: row.profiles?.full_name || 'Unknown User',
      customerEmail: row.profiles?.email || '-',
      customerPhone: row.phone,
      itemLabel: row.data_packages?.name || 'Data Package',
      networkOrCategory: row.data_packages?.network || '-',
      amount: Number(row.amount || 0),
      status: normalizeAdminOrderStatus(row.status) as UnifiedOrderRow['status'],
      createdAt: row.created_at,
      retryCount: Number(row.retry_count || 0),
      retryTargetOrderId: row.id,
    }))

    const afaRows: UnifiedOrderRow[] = ((afaResult.data as AfaOrderRow[] | null) || []).map((row) => ({
      id: row.id,
      source: 'dashboard_afa',
      orderType: 'AFA',
      reference: row.reference || row.id,
      customerName: row.full_name || row.profiles?.full_name || 'Unknown User',
      customerEmail: row.profiles?.email || '-',
      customerPhone: row.phone,
      itemLabel: 'AFA Registration',
      networkOrCategory: 'AFA',
      amount: Number(row.amount || 0),
      status: normalizeAdminOrderStatus(row.status) as UnifiedOrderRow['status'],
      createdAt: row.created_at,
      retryCount: 0,
      retryTargetOrderId: null,
    }))

    const storeRows: UnifiedOrderRow[] = ((storeResult.data as StoreOrderRow[] | null) || []).map((row) => {
      const isStoreAfa = row.item_type === 'data' && String(row.data_packages?.network || '').trim().toUpperCase() === 'AFA'

      return {
      id: row.id,
      source: row.item_type === 'service' ? 'store_service' : (isStoreAfa ? 'store_afa' : 'store_data'),
      orderType: row.item_type === 'service' ? 'Service' : (isStoreAfa ? 'AFA' : 'Data'),
      reference: `STORE-${row.id.slice(0, 8).toUpperCase()}`,
      customerName: row.customer_name || 'Store Customer',
      customerEmail: row.customer_email || '-',
      customerPhone: row.customer_phone,
      itemLabel: row.item_type === 'service' ? (row.online_services?.name || 'Store Service') : (isStoreAfa ? 'Store AFA Registration' : (row.data_packages?.name || 'Store Data')),
      networkOrCategory: row.item_type === 'service' ? (row.online_services?.category || 'Service') : (row.data_packages?.network || '-'),
      amount: Number(row.total_price || 0),
      status: normalizeAdminOrderStatus(row.status) as UnifiedOrderRow['status'],
      createdAt: row.created_at,
      retryCount: 0,
      retryTargetOrderId: null,
    }})

    const unifiedRows = [...dashboardRows, ...afaRows, ...storeRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const filteredRows = status === 'all' ? unifiedRows : unifiedRows.filter((row) => row.status === status)

    setRows(filteredRows)
    setLoading(false)
  }, [status])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetch('/api/orders/auto-complete', { method: 'POST' }).then(() => loadOrders())
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [loadOrders])

  useEffect(() => {
    const channel = supabase.client
      .channel('admin-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'afa_registrations' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_store_orders' }, () => void loadOrders())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [loadOrders])

  const updateOrderStatus = async (row: UnifiedOrderRow, nextStatus: string) => {
    setUpdatingId(row.id)

    const response = await fetch('/api/admin/orders/status', {
      method: 'PATCH',
      headers: await getAdminAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        source: row.source,
        orderId: row.id,
        status: nextStatus,
      }),
    })

    const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string }
    setUpdatingId(null)

    if (!response.ok || !result?.success) {
      toast.error(result?.error || 'Unable to update order status')
      return
    }

    toast.success(`Order status updated to ${nextStatus}`)
    void loadOrders()
  }

  const retryOrder = async (row: UnifiedOrderRow) => {
    if (!row.retryTargetOrderId) {
      return
    }

    const { error } = await supabase.client
      .from('orders')
      .update({ status: 'pending', retry_count: row.retryCount + 1, status_locked: false })
      .eq('id', row.retryTargetOrderId)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Order moved back to pending')
    void loadOrders()
  }

  const exportCsv = () => {
    const csv = toCsv(
      rows.map((row) => ({
        order_id: row.id,
        reference: row.reference,
        source: row.source,
        order_type: row.orderType,
        customer: row.customerName,
        email: row.customerEmail,
        network_or_category: row.networkOrCategory,
        item: row.itemLabel,
        phone: row.customerPhone,
        amount: row.amount,
        status: normalizeAdminOrderStatus(row.status) as UnifiedOrderRow['status'],
        retry_count: row.retryCount,
        created_at: row.createdAt,
      }))
    )

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const groupedCount = useMemo(() => {
    return {
      all: rows.length,
      pending: rows.filter((x) => x.status === 'pending').length,
      processing: rows.filter((x) => x.status === 'processing').length,
      delivered: rows.filter((x) => x.status === 'delivered').length,
      failed: rows.filter((x) => x.status === 'failed' || x.status === 'rejected' || x.status === 'declined').length,
    }
  }, [rows])

  return (
    <AdminPageShell
      title="Orders"
      description="Unified feed of dashboard and store orders for data, AFA, and services."
      actions={
        <Button onClick={exportCsv} className="min-h-11">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle className="text-base">Order Status Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Total: {groupedCount.all}</Badge>
            <Badge variant="secondary">Pending: {groupedCount.pending}</Badge>
            <Badge variant="outline">Processing: {groupedCount.processing}</Badge>
            <Badge variant="default">Delivered: {groupedCount.delivered}</Badge>
            <Badge variant="destructive">Failed/Rejected: {groupedCount.failed}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">Reference</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={10}>Loading orders...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={10}>No orders found.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-xs">{row.reference}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline">{row.source.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary">{row.orderType}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.customerName || '-'}</p>
                    <p className="text-xs text-muted-foreground">{row.customerEmail || '-'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{row.itemLabel || '-'}</p>
                    <p className="text-xs text-muted-foreground">{row.networkOrCategory || '-'}</p>
                  </td>
                  <td className="px-3 py-3">{row.customerPhone}</td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(row.amount || 0))}</td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[180px] flex-col gap-2">
                      <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                      <Select
                        value={row.status}
                        onValueChange={(value) => void updateOrderStatus(row, value)}
                        disabled={updatingId === row.id}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Change status" />
                        </SelectTrigger>
                        <SelectContent>
                          {adminStatusOptions[row.source as AdminOrderSource].map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-3">
                    {row.status === 'failed' && row.retryTargetOrderId ? (
                      <Button size="sm" variant="outline" onClick={() => void retryOrder(row)}>
                        <RotateCw className="mr-1 h-3.5 w-3.5" /> Retry
                      </Button>
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
