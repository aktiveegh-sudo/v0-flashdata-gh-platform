'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { AdminPageShell } from '@/components/admin/page-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type PackageRow = {
  id: string
  network: 'MTN' | 'Airtel-Tigo' | 'Telecel' | 'AFA'
  name: string
  amount: string
  cost_price: number
  public_price: number
  agent_price: number
  selling_price: number
  validity: string
  is_active: boolean
}

const networkOrder: Record<string, number> = {
  MTN: 0,
  'Airtel-Tigo': 1,
  Telecel: 2,
  AFA: 3,
  mtn: 0,
  airteltigo: 1,
  telecel: 2,
  afa: 3,
}

const emptyForm = {
  network: 'MTN',
  amount: '',
  cost_price: '',
  public_price: '',
  agent_price: '',
  is_active: true,
}

export default function AdminPackagesPage() {
  const [rows, setRows] = useState<PackageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadPackages = async () => {
    setLoading(true)
    const { data, error } = await supabase.client
      .from('data_packages')
      .select('id,network,name,amount,cost_price,public_price,agent_price,selling_price,validity,is_active')
      .order('network', { ascending: true })
      .order('cost_price', { ascending: true })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const toOrderKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

    const sortedRows = ((data as PackageRow[]) || []).sort((a, b) => {
      const networkA = toOrderKey(a.network)
      const networkB = toOrderKey(b.network)
      const networkDiff = (networkOrder[a.network] ?? networkOrder[networkA] ?? 99) - (networkOrder[b.network] ?? networkOrder[networkB] ?? 99)
      if (networkDiff !== 0) return networkDiff

      const amountDiff = a.amount.localeCompare(b.amount, undefined, { numeric: true, sensitivity: 'base' })
      if (amountDiff !== 0) return amountDiff

      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    })

    setRows(sortedRows)
    setLoading(false)
  }

  useEffect(() => {
    void loadPackages()
  }, [])

  const submitPackage = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      network: form.network as PackageRow['network'],
      name: `${form.network} ${form.amount}`.trim(),
      amount: form.amount,
      cost_price: Number(form.cost_price),
      public_price: Number(form.public_price),
      agent_price: Number(form.agent_price),
      selling_price: Number(form.agent_price),
      validity: 'Non-expiry',
      is_active: Boolean(form.is_active),
    }

    if (!payload.amount || Number.isNaN(payload.cost_price) || Number.isNaN(payload.public_price) || Number.isNaN(payload.agent_price)) {
      toast.error('Please fill all required fields')
      return
    }

    if (payload.cost_price < 0 || payload.public_price < 0 || payload.agent_price < 0) {
      toast.error('All prices must be non-negative')
      return
    }

    if (payload.agent_price < payload.cost_price) {
      toast.error('Agent price cannot be less than cost price')
      return
    }

    if (editingId) {
      const { error } = await supabase.client.from('data_packages').update(payload).eq('id', editingId)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Package updated')
    } else {
      const { error } = await supabase.client.from('data_packages').insert(payload)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Package added')
    }

    setForm(emptyForm)
    setEditingId(null)
    void loadPackages()
  }

  const editPackage = (pkg: PackageRow) => {
    setEditingId(pkg.id)
    setForm({
      network: pkg.network,
      amount: pkg.amount,
      cost_price: String(pkg.cost_price),
      public_price: String(pkg.public_price ?? pkg.selling_price),
      agent_price: String(pkg.agent_price ?? pkg.selling_price),
      is_active: pkg.is_active,
    })
  }

  const deletePackage = async (id: string) => {
    if (!window.confirm('Delete this package?')) {
      return
    }

    const { error } = await supabase.client.from('data_packages').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Package deleted')
    void loadPackages()
  }

  return (
    <AdminPageShell
      title="Packages"
      description="Create packages using Network, Data Volume, and Amount format."
    >
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Package' : 'Add New Package'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPackage} className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={form.network} onValueChange={(value) => setForm((prev) => ({ ...prev, network: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN</SelectItem>
                  <SelectItem value="Airtel-Tigo">Airtel-Tigo</SelectItem>
                  <SelectItem value="Telecel">Telecel</SelectItem>
                  <SelectItem value="AFA">AFA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Volume</Label>
              <Input value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="5GB" />
            </div>
            <div className="space-y-2">
              <Label>Cost Price (GHc)</Label>
              <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((prev) => ({ ...prev, cost_price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>User Price (GHc)</Label>
              <Input type="number" min="0" step="0.01" value={form.public_price} onChange={(e) => setForm((prev) => ({ ...prev, public_price: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Agent Price (GHc)</Label>
              <Input type="number" min="0" step="0.01" value={form.agent_price} onChange={(e) => setForm((prev) => ({ ...prev, agent_price: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 xl:col-span-2">
              <div>
                <p className="text-sm font-medium">Active for Checkout</p>
                <p className="text-xs text-muted-foreground">Visible on public and agent pages</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(value) => setForm((prev) => ({ ...prev, is_active: value }))} />
            </div>
            <div className="md:col-span-2 xl:col-span-6 flex flex-wrap gap-2">
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                {editingId ? 'Save Package' : 'Add Package'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm) }}>
                  Cancel Edit
                </Button>
              )}
              <Badge variant="outline" className="h-10 px-3 py-2">Validity: Non-expiry</Badge>
              <Badge variant="secondary" className="h-10 px-3 py-2">One price for public users and one for agents</Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0a0a0f]">
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">Network</th>
                <th className="px-3 py-3">Data Volume</th>
                <th className="px-3 py-3">User Price</th>
                <th className="px-3 py-3">Agent Price</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={6}>Loading packages...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={6}>No packages found.</td></tr>
              ) : rows.map((pkg) => (
                <tr key={pkg.id} className="border-t border-border">
                  <td className="px-3 py-3">{pkg.network}</td>
                  <td className="px-3 py-3">{pkg.amount}</td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(pkg.public_price || 0))}</td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(pkg.agent_price || pkg.selling_price || 0))}</td>
                  <td className="px-3 py-3">
                    <Badge variant={pkg.is_active ? 'default' : 'secondary'}>{pkg.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editPackage(pkg)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void deletePackage(pkg.id)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
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
