'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { ghanaCurrency } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type PackageRow = {
  id: string
  network: 'MTN' | 'Airtel-Tigo' | 'Telecel' | 'AFA'
  name: string
  amount: string
  cost_price: number
  selling_price: number
  validity: string
  is_active: boolean
}

const emptyForm = {
  network: 'MTN',
  name: '',
  amount: '',
  cost_price: '',
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
      .select('id,network,name,amount,cost_price,selling_price,validity,is_active')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setRows((data as PackageRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadPackages()
  }, [])

  const submitPackage = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      network: form.network as PackageRow['network'],
      name: form.name,
      amount: form.amount,
      cost_price: Number(form.cost_price),
      selling_price: editingId ? rows.find((pkg) => pkg.id === editingId)?.selling_price ?? Number(form.cost_price) : Number(form.cost_price),
      validity: 'Non-expiry',
    }

    if (!payload.name || !payload.amount || Number.isNaN(payload.cost_price)) {
      toast.error('Please fill all required fields')
      return
    }

    if (Number.isNaN(payload.selling_price)) {
      payload.selling_price = payload.cost_price
    }

    if (payload.selling_price < payload.cost_price) {
      payload.selling_price = payload.cost_price
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
      name: pkg.name,
      amount: pkg.amount,
      cost_price: String(pkg.cost_price),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Packages</h1>
        <p className="text-sm text-muted-foreground">Create and maintain data package pricing and inventory.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Package' : 'Add New Package'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPackage} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="MTN 5GB Weekly" />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="5GB" />
            </div>
            <div className="space-y-2">
              <Label>Cost Price</Label>
              <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((prev) => ({ ...prev, cost_price: e.target.value }))} />
            </div>
            <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-2">
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
              <Badge variant="secondary" className="h-10 px-3 py-2">Selling price is managed by agents</Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-3 py-3">Network</th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Data Price</th>
                <th className="px-3 py-3">Selling</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={7}>Loading packages...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-muted-foreground" colSpan={7}>No packages found.</td></tr>
              ) : rows.map((pkg) => (
                <tr key={pkg.id} className="border-t border-border">
                  <td className="px-3 py-3">{pkg.network}</td>
                  <td className="px-3 py-3 font-medium">{pkg.name}</td>
                  <td className="px-3 py-3">{pkg.amount}</td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(pkg.cost_price || 0))}</td>
                  <td className="px-3 py-3">{ghanaCurrency(Number(pkg.selling_price || 0))}</td>
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
    </div>
  )
}
