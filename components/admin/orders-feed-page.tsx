'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, RotateCw } from 'lucide-react'
import { AdminPageShell } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { getAdminAuthHeaders } from '@/lib/admin/client-auth'
import { formatDateTime, ghanaCurrency, toCsv } from '@/lib/admin/utils'
import {
  mapAfaOrders,
  mapAirtimeTransactions,
  mapDashboardDataOrders,
  mapStoreOrders,
  matchesOrderCategory,
  orderCategoryMeta,
  type AdminOrderCategory,
  type UnifiedOrderRow,
} from '@/lib/admin/orders-feed'
import { adminStatusOptions, normalizeAdminOrderStatus, type AdminOrderSource } from '@/lib/orders/status'
import toast from 'react-hot-toast'

const statusOptions = ['all', 'pending', 'processing', 'delivered', 'failed', 'rejected', 'declined'] as const
type StatusFilter = (typeof statusOptions)[number]

const statusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'delivered') return 'default'
  if (status === 'failed' || status === 'rejected' || status === 'declined') return 'destructive'
  if (status === 'processing') return 'outline'
  return 'secondary'
}

const categoryLinks: Array<{ key: Exclude<AdminOrderCategory, 'all'>; label: string }> = [
  { key: 'data', label: 'Data' },
  { key: 'afa', label: 'AFA' },
  { key: 'airtime', label: 'Airtime' },
  { key: 'services', label: 'Services' },
]

type AdminOrdersFeedPageProps = {
  category: Exclude<AdminOrderCategory, 'all'>
}

export function AdminOrdersFeedPage({ category }: AdminOrdersFeedPageProps) {
  const meta = orderCategoryMeta[category]
  const [rows, setRows] = useState<UnifiedOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    await fetch('/api/orders/auto-complete', { method: 'POST' }).catch(() => null)

    const [dashboardDataResult, afaResult, storeResult, airtimeResult] = await Promise.all([
      supabase.client
        .from('orders')
        .select(
          'id,user_id,phone,amount,status,reference,retry_count,created_at,profiles(full_name,email),data_packages(network,name,amount)'
        )
        .order('created_at', { ascending: false }),
      supabase.client
        .from('afa_registrations')
        .select('id,user_id,full_name,phone,amount,status,reference,created_at,profiles(full_name,email)')
        .order('created_at', { ascending: false }),
      supabase.client
        .from('agent_store_orders')
        .select(
          'id,item_type,customer_name,customer_phone,customer_email,total_price,status,created_at,data_packages(network,name,amount),online_services(name,category)'
        )
        .order('created_at', { ascending: false }),
      supabase.client
        .from('transactions')
        .select('id,user_id,amount,status,reference,description,created_at,metadata,profiles(full_name,email,phone)')
        .eq('type', 'airtime')
        .order('created_at', { ascending: false }),
    ])

    if (dashboardDataResult.error || afaResult.error || storeResult.error || airtimeResult.error) {
      toast.error(
        dashboardDataResult.error?.message ||
          afaResult.error?.message ||
          storeResult.error?.message ||
          airtimeResult.error?.message ||
          'Failed to load orders'
      )
      setLoading(false)
      return
    }

    const unifiedRows = [
      ...mapDashboardDataOrders((dashboardDataResult.data as any[]) || []),
      ...mapAfaOrders((afaResult.data as any[]) || []),
      ...mapStoreOrders((storeResult.data as any[]) || []),
      ...mapAirtimeTransactions((airtimeResult.data as any[]) || []),
    ]
      .filter((row) => matchesOrderCategory(row, category))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const filteredRows = status === 'all' ? unifiedRows : unifiedRows.filter((row) => row.status === status)
    setRows(filteredRows)
    setLoading(false)
  }, [category, status])

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
      .channel(`admin-orders-${category}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'afa_registrations' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_store_orders' }, () => void loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => void loadOrders())
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [category, loadOrders])

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
    if (!row.retryTargetOrderId) return

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
        status: normalizeAdminOrderStatus(row.status),
        retry_count: row.retryCount,
        created_at: row.createdAt,
      }))
    )

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meta.exportPrefix}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const groupedCount = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((x) => x.status === 'pending').length,
      processing: rows.filter((x) => x.status === 'processing').length,
      delivered: rows.filter((x) => x.status === 'delivered').length,
      failed: rows.filter((x) => ['failed', 'rejected', 'declined'].includes(x.status)).length,
    }),
    [rows]
  )

  return (
    <AdminPageShell
      title={meta.title}
      description={meta.description}
      actions={
        <Button onClick={exportCsv} className="min-h-11">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        {categoryLinks.map((item) => (
          <Button key={item.key} asChild variant={item.key === category ? 'default' : 'outline'} size="sm">
            <Link href={orderCategoryMeta[item.key].href}>{item.label}</Link>
          </Button>
        ))}
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">All categories</Link>
        </Button>
      </div>

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle className="text-base">Order Status Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[220px_1fr]">
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All' : option[0].toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
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
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={9}>
                    Loading orders...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={9}>
                    No {category} orders found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="border-t border-border">
                    <td className="px-3 py-3 font-mono text-xs">{row.reference}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{row.source.replaceAll('_', ' ')}</Badge>
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
                            {(adminStatusOptions[row.source as AdminOrderSource] || []).map((option) => (
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
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminPageShell>
  )
}
