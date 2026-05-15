'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime, ghanaCurrency, toCsv } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type OrderRow = {
  id: string
  user_id: string
  phone: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  reference: string
  retry_count: number
  created_at: string
  profiles?: { full_name: string | null; email: string | null } | null
  data_packages?: { network: string; name: string } | null
}

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | 'pending' | 'success' | 'failed'>('all')

  const loadOrders = async () => {
    setLoading(true)
    const query = supabase.client
      .from('orders')
      .select('id,user_id,phone,amount,status,reference,retry_count,created_at,profiles(full_name,email),data_packages(network,name)')
      .order('created_at', { ascending: false })

    const { data, error } = status === 'all' ? await query : await query.eq('status', status)

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setRows((data as OrderRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadOrders()
  }, [status])

  const retryOrder = async (row: OrderRow) => {
    const { error } = await supabase.client
      .from('orders')
      .update({ status: 'pending', retry_count: row.retry_count + 1 })
      .eq('id', row.id)

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
        user: row.profiles?.full_name || '-',
        email: row.profiles?.email || '-',
        network: row.data_packages?.network || '-',
        package: row.data_packages?.name || '-',
        phone: row.phone,
        amount: row.amount,
        status: row.status,
        retry_count: row.retry_count,
        created_at: row.created_at,
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
      success: rows.filter((x) => x.status === 'success').length,
      failed: rows.filter((x) => x.status === 'failed').length,
    }
  }, [rows])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">Track, filter, retry failed requests, and export records.</p>
        </div>
        <Button onClick={exportCsv} className="min-h-11">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
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
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">Total: {groupedCount.all}</Badge>
            <Badge variant="secondary">Pending: {groupedCount.pending}</Badge>
            <Badge variant="default">Success: {groupedCount.success}</Badge>
            <Badge variant="destructive">Failed: {groupedCount.failed}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">Order ID</th>
                <th className="px-3 py-3">User</th>
                <th className="px-3 py-3">Package/Network</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={8}>Loading orders...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={8}>No orders found.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono text-xs">{row.reference}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{row.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{row.profiles?.email || '-'}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{row.data_packages?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{row.data_packages?.network || '-'}</p>
                  </td>
                  <td className="px-3 py-3">{row.phone}</td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(row.amount || 0))}</td>
                  <td className="px-3 py-3">
                    <Badge variant={row.status === 'success' ? 'default' : row.status === 'pending' ? 'secondary' : 'destructive'}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">{formatDateTime(row.created_at)}</td>
                  <td className="px-3 py-3">
                    {row.status === 'failed' ? (
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
    </div>
  )
}
