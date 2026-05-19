'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Edit2, Trash2, Package, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const networkColors: Record<string, string> = {
  MTN: 'bg-yellow-500 text-black',
  'Airtel-Tigo': 'bg-red-500 text-white',
  Telecel: 'bg-blue-600 text-white',
  AFA: 'bg-emerald-600 text-white',
}

type BasePackage = {
  id: string
  network: string
  name: string
  amount: string
  cost_price: number
  selling_price: number
  validity: string
}

type StorePackage = {
  id: string
  selling_price: number
  is_active: boolean
  data_packages: BasePackage | null
}

const networkOrder: Record<string, number> = {
  MTN: 0,
  'Airtel-Tigo': 1,
  Telecel: 2,
  AFA: 3,
}

export default function StorePackagesPage() {
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState('')
  const [savingAfa, setSavingAfa] = useState(false)

  const [basePackages, setBasePackages] = useState<BasePackage[]>([])
  const [storePackages, setStorePackages] = useState<StorePackage[]>([])
  const [afaBasePackage, setAfaBasePackage] = useState<BasePackage | null>(null)
  const [afaStorePackage, setAfaStorePackage] = useState<StorePackage | null>(null)
  const [afaProfit, setAfaProfit] = useState('')
  const [afaActive, setAfaActive] = useState(true)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<StorePackage | null>(null)

  const [formData, setFormData] = useState({
    basePackageId: '',
    sellingPrice: '',
    active: true,
  })

  const availableBasePackages = useMemo(() => {
    if (editingPackage) {
      return basePackages.filter((pkg) => pkg.network !== 'AFA')
    }

    const selectedIds = new Set(storePackages.map((pkg) => pkg.data_packages?.id).filter(Boolean))
    return basePackages.filter((pkg) => pkg.network !== 'AFA' && !selectedIds.has(pkg.id))
  }, [basePackages, editingPackage, storePackages])

  const nonAfaStorePackages = useMemo(
    () => storePackages.filter((pkg) => pkg.data_packages?.network !== 'AFA'),
    [storePackages]
  )

  const listedBasePackages = useMemo(
    () => basePackages.filter((pkg) => pkg.network !== 'AFA'),
    [basePackages]
  )

  const storePackageByBaseId = useMemo(() => {
    const map = new Map<string, StorePackage>()
    for (const pkg of nonAfaStorePackages) {
      const baseId = pkg.data_packages?.id
      if (baseId) {
        map.set(baseId, pkg)
      }
    }
    return map
  }, [nonAfaStorePackages])

  const selectedBasePackage = useMemo(
    () => basePackages.find((pkg) => pkg.id === formData.basePackageId) || null,
    [basePackages, formData.basePackageId]
  )

  const loadData = async () => {
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      toast.error('Please login again')
      setLoading(false)
      return
    }

    const { data: store, error: storeError } = await supabase.client
      .from('agent_stores')
      .select('id')
      .eq('agent_id', authData.user.id)
      .maybeSingle()

    if (storeError) {
      toast.error(storeError.message)
      setLoading(false)
      return
    }

    if (!store) {
      toast.error('Set up your store in Store Settings first')
      setLoading(false)
      return
    }

    setStoreId(store.id)

    const [{ data: allBase, error: baseError }, { data: configured, error: configuredError }] = await Promise.all([
      supabase.client
        .from('data_packages')
        .select('id,network,name,amount,cost_price,selling_price,validity')
        .eq('is_active', true)
        .order('network')
        .order('cost_price'),
      supabase.client
        .from('agent_store_packages')
        .select('id,selling_price,is_active,data_packages(id,network,name,amount,cost_price,selling_price,validity)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),
    ])

    if (baseError) {
      toast.error(baseError.message)
      setLoading(false)
      return
    }

    if (configuredError) {
      toast.error(configuredError.message)
      setLoading(false)
      return
    }

    const sortedBasePackages = ((allBase as BasePackage[] | null) ?? []).sort((a, b) => {
      const networkDiff = (networkOrder[a.network] ?? 99) - (networkOrder[b.network] ?? 99)
      if (networkDiff !== 0) return networkDiff
      return Number(a.cost_price || 0) - Number(b.cost_price || 0)
    })

    const sortedStorePackages = ((configured as StorePackage[] | null) ?? []).sort((a, b) => {
      const networkA = a.data_packages?.network || ''
      const networkB = b.data_packages?.network || ''
      const networkDiff = (networkOrder[networkA] ?? 99) - (networkOrder[networkB] ?? 99)
      if (networkDiff !== 0) return networkDiff
      return Number(a.data_packages?.cost_price || 0) - Number(b.data_packages?.cost_price || 0)
    })

    const afaBase =
      sortedBasePackages.find((pkg) => pkg.network === 'AFA' && pkg.name === 'AFA Registration') ||
      sortedBasePackages.find((pkg) => pkg.network === 'AFA') ||
      null
    const afaStore =
      sortedStorePackages.find((pkg) => pkg.data_packages?.network === 'AFA' && pkg.data_packages?.name === 'AFA Registration') ||
      sortedStorePackages.find((pkg) => pkg.data_packages?.network === 'AFA') ||
      null
    const currentAfaProfit = afaStore
      ? Number(afaStore.selling_price || 0) - Number(afaStore.data_packages?.cost_price || 0)
      : 0

    setBasePackages(sortedBasePackages)
    setStorePackages(sortedStorePackages)
    setAfaBasePackage(afaBase)
    setAfaStorePackage(afaStore)
    setAfaProfit(currentAfaProfit.toFixed(2))
    setAfaActive(afaStore?.is_active ?? true)
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetForm = () => {
    setFormData({
      basePackageId: '',
      sellingPrice: '',
      active: true,
    })
    setEditingPackage(null)
  }

  const handleOpenDialog = (pkg?: StorePackage) => {
    if (pkg) {
      setEditingPackage(pkg)
      setFormData({
        basePackageId: pkg.data_packages?.id || '',
        sellingPrice: pkg.selling_price.toString(),
        active: pkg.is_active,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleOpenDialogForBase = (pkg: BasePackage) => {
    const existing = storePackageByBaseId.get(pkg.id)

    if (existing) {
      handleOpenDialog(existing)
      return
    }

    setEditingPackage(null)
    setFormData({
      basePackageId: pkg.id,
      sellingPrice: '',
      active: true,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!storeId || !formData.basePackageId || !formData.sellingPrice) {
      toast.error('Please fill in all fields')
      return
    }

    const sellingPrice = Number.parseFloat(formData.sellingPrice)
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      toast.error('Selling price must be greater than zero')
      return
    }

    const basePrice = Number(selectedBasePackage?.cost_price || 0)
    if (basePrice > 0 && sellingPrice < basePrice) {
      toast.error(`Selling price cannot be below base price (GHc ${basePrice.toFixed(2)})`)
      return
    }

    if (editingPackage) {
      const { error } = await supabase.client
        .from('agent_store_packages')
        .update({
          selling_price: sellingPrice,
          is_active: formData.active,
        })
        .eq('id', editingPackage.id)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Package updated successfully')
    } else {
      const { error } = await supabase.client
        .from('agent_store_packages')
        .insert({
          store_id: storeId,
          data_package_id: formData.basePackageId,
          selling_price: sellingPrice,
          is_active: formData.active,
        })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Package added successfully')
    }

    setIsDialogOpen(false)
    resetForm()
    await loadData()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.client
      .from('agent_store_packages')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Package deleted successfully')
    await loadData()
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.client
      .from('agent_store_packages')
      .update({ is_active: active })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Package ${active ? 'activated' : 'deactivated'}`)
    await loadData()
  }

  const handleSaveAfaPricing = async () => {
    if (!storeId || !afaBasePackage) {
      toast.error('AFA base package is not configured by admin yet')
      return
    }

    const profitValue = Number.parseFloat(afaProfit)
    if (!Number.isFinite(profitValue) || profitValue < 0) {
      toast.error('Profit must be a valid non-negative number')
      return
    }

    const sellingPrice = Number(afaBasePackage.cost_price || 0) + profitValue

    setSavingAfa(true)

    if (afaStorePackage) {
      const { error } = await supabase.client
        .from('agent_store_packages')
        .update({
          selling_price: sellingPrice,
          is_active: afaActive,
        })
        .eq('id', afaStorePackage.id)

      setSavingAfa(false)

      if (error) {
        toast.error(error.message)
        return
      }
    } else {
      const { error } = await supabase.client
        .from('agent_store_packages')
        .insert({
          store_id: storeId,
          data_package_id: afaBasePackage.id,
          selling_price: sellingPrice,
          is_active: afaActive,
        })

      setSavingAfa(false)

      if (error) {
        toast.error(error.message)
        return
      }
    }

    toast.success('AFA store pricing saved')
    await loadData()
  }

  const profit = (sellingPrice: number, costPrice: number) => sellingPrice - costPrice

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading store packages...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Store Data Packages</h1>
          <p className="text-muted-foreground">All available packages are listed below. Set your price and publish.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPackage ? 'Edit Package' : 'Add New Package'}</DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? 'Update the package details below'
                  : 'Select a base package and set your selling price'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Base Package</Label>
                <Select
                  value={formData.basePackageId}
                  onValueChange={(value) => setFormData({ ...formData, basePackageId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBasePackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.network} - {pkg.name} ({pkg.amount}) - Base GHc {Number(pkg.cost_price || 0).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBasePackage ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-sm font-medium text-foreground">
                    Base Price: GHc {Number(selectedBasePackage.cost_price || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Set your selling price above this amount to add your profit.
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price (GHc)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  placeholder={selectedBasePackage ? `Min ${Number(selectedBasePackage.cost_price || 0).toFixed(2)}` : '0.00'}
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Visible on your public store</p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>

              {formData.basePackageId && formData.sellingPrice && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">
                    Base price:{' '}
                    <span className="font-semibold text-foreground">
                      GHc {Number(selectedBasePackage?.cost_price || 0).toFixed(2)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Profit per sale:{' '}
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      GHc{' '}
                      {profit(
                        parseFloat(formData.sellingPrice),
                        selectedBasePackage?.cost_price || 0
                      ).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()}>
                {editingPackage ? 'Update Package' : 'Add Package'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AFA Registration Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          {!afaBasePackage ? (
            <p className="text-sm text-muted-foreground">Admin has not configured AFA base pricing yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-sm text-muted-foreground">
                  Base AFA Price:{' '}
                  <span className="font-semibold text-foreground">GHc {Number(afaBasePackage.cost_price || 0).toFixed(2)}</span>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="afaProfit">Your Profit (GHc)</Label>
                  <Input
                    id="afaProfit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={afaProfit}
                    onChange={(e) => setAfaProfit(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Final Store Price (GHc)</Label>
                  <div className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
                    GHc {(Number(afaBasePackage.cost_price || 0) + Number.parseFloat(afaProfit || '0')).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Visible on your public store</p>
                </div>
                <Switch checked={afaActive} onCheckedChange={setAfaActive} />
              </div>

              <Button onClick={() => void handleSaveAfaPricing()} disabled={savingAfa}>
                {savingAfa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save AFA Pricing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            All Available Packages ({listedBasePackages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Network</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Package</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Selling Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Profit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listedBasePackages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No packages available yet.
                    </td>
                  </tr>
                ) : (
                  listedBasePackages.map((basePkg) => {
                    const configured = storePackageByBaseId.get(basePkg.id)

                    return (
                    <tr key={basePkg.id} className="border-b border-border transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Badge className={networkColors[basePkg.network || ''] || 'bg-primary'}>
                          {basePkg.network || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{basePkg.name} ({basePkg.amount})</td>
                      <td className="px-4 py-3">GHc {Number(basePkg.cost_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold">
                        {configured ? `GHc ${Number(configured.selling_price).toFixed(2)}` : <span className="text-muted-foreground">Not set</span>}
                      </td>
                      <td className="px-4 py-3">
                        {configured ? (
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            GHc {profit(Number(configured.selling_price), Number(basePkg.cost_price || 0)).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {configured ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={configured.is_active}
                              onCheckedChange={(checked) => void handleToggleActive(configured.id, checked)}
                            />
                            <span className={configured.is_active ? 'text-green-600' : 'text-muted-foreground'}>
                              {configured.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not added</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialogForBase(basePkg)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {configured ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => void handleDelete(configured.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {listedBasePackages.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No packages available yet.</p>
            ) : (
              listedBasePackages.map((basePkg) => {
                const configured = storePackageByBaseId.get(basePkg.id)

                return (
                <Card key={basePkg.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={networkColors[basePkg.network || ''] || 'bg-primary'}>
                            {basePkg.network || 'N/A'}
                          </Badge>
                          <span className="font-semibold text-foreground">{basePkg.name} ({basePkg.amount})</span>
                        </div>
                        {configured ? (
                          <Switch
                            checked={configured.is_active}
                            onCheckedChange={(checked) => void handleToggleActive(configured.id, checked)}
                          />
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cost</p>
                          <p className="font-medium">GHc {Number(basePkg.cost_price || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Selling</p>
                          <p className="font-semibold">
                            {configured ? `GHc ${Number(configured.selling_price).toFixed(2)}` : 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Profit</p>
                          {configured ? (
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              GHc {profit(Number(configured.selling_price), Number(basePkg.cost_price || 0)).toFixed(2)}
                            </p>
                          ) : (
                            <p className="font-semibold text-muted-foreground">-</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialogForBase(basePkg)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          {configured ? 'Edit' : 'Set Price'}
                        </Button>
                        {configured ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive"
                            onClick={() => void handleDelete(configured.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
