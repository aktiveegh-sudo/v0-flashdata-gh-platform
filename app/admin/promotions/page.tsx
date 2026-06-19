'use client'

import { useState } from 'react'
import { Copy, Download, Plus, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminPageShell, AdminPanel, AdminStatCard, AdminStatGrid } from '@/components/admin/page-shell'
import { toCsv } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type PromoCode = {
  id: string
  code: string
  discount: number
  type: 'percent' | 'fixed'
  status: 'active' | 'expired'
  uses: number
  maxUses: number
}

const DEFAULT_CODES: PromoCode[] = [
  { id: '1', code: 'FLASH10', discount: 10, type: 'percent', status: 'active', uses: 0, maxUses: 100 },
  { id: '2', code: 'WELCOME5', discount: 5, type: 'fixed', status: 'active', uses: 0, maxUses: 50 },
]

export default function AdminPromotionsPage() {
  const [codes, setCodes] = useState<PromoCode[]>(DEFAULT_CODES)
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('10')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [maxUses, setMaxUses] = useState('100')

  const createCode = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    const parsedDiscount = Number(discount)
    const parsedMax = Number(maxUses)
    if (!trimmed || Number.isNaN(parsedDiscount) || parsedDiscount <= 0) {
      toast.error('Enter a valid code and discount')
      return
    }
    if (codes.some((c) => c.code === trimmed)) {
      toast.error('Code already exists')
      return
    }
    setCodes((prev) => [
      {
        id: crypto.randomUUID(),
        code: trimmed,
        discount: parsedDiscount,
        type,
        status: 'active',
        uses: 0,
        maxUses: Number.isNaN(parsedMax) ? 100 : parsedMax,
      },
      ...prev,
    ])
    setCode('')
    toast.success('Promo code created')
  }

  const exportCsv = () => {
    const csv = toCsv(
      codes.map((c) => ({
        code: c.code,
        discount: c.discount,
        type: c.type,
        status: c.status,
        uses: c.uses,
        max_uses: c.maxUses,
      }))
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flashdata-promo-codes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyCode = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success('Code copied')
  }

  return (
    <AdminPageShell
      title="Promo Codes"
      description="Create and manage promotional discount codes."
      actions={
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!codes.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      }
      stats={
        <AdminStatGrid>
          <AdminStatCard label="Total Codes" value={String(codes.length)} icon={Tag} />
          <AdminStatCard label="Active" value={String(codes.filter((c) => c.status === 'active').length)} />
          <AdminStatCard label="Total Uses" value={String(codes.reduce((s, c) => s + c.uses, 0))} />
          <AdminStatCard label="Avg Discount" value={`${Math.round(codes.reduce((s, c) => s + c.discount, 0) / (codes.length || 1))}${codes[0]?.type === 'percent' ? '%' : ' GHS'}`} />
        </AdminStatGrid>
      }
    >
      <AdminPanel title="Create Code">
        <form onSubmit={createCode} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="FLASH20" className="uppercase" />
          </div>
          <div className="space-y-2">
            <Label>Discount</Label>
            <Input type="number" min="1" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'percent' | 'fixed')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent (%)</SelectItem>
                <SelectItem value="fixed">Fixed (GHS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Max Uses</Label>
            <Input type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <Button type="submit">
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </form>
      </AdminPanel>

      <AdminPanel title="Active Codes" description="Stored in local session — export to persist">
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500 dark:border-white/5 dark:text-white/50">
              <tr>
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Discount</th>
                <th className="pb-3 pr-4">Uses</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4" />
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 dark:border-white/5">
                  <td className="py-3 pr-4 font-mono font-semibold text-amber-600 dark:text-amber-400">{row.code}</td>
                  <td className="py-3 pr-4">
                    {row.type === 'percent' ? `${row.discount}%` : `GHS ${row.discount.toFixed(2)}`}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-white/70">
                    {row.uses} / {row.maxUses}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-500/20 dark:text-green-300">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Button size="icon" variant="ghost" onClick={() => void copyCode(row.code)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminPageShell>
  )
}
