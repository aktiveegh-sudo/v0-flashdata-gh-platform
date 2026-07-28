'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Loader2, Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type BaseService = {
  id: string
  name: string
  category: string
  agent_price: number
  description: string | null
  image_url: string | null
}

type StoreService = {
  id: string
  selling_price: number
  is_active: boolean
  online_services: BaseService | null
}

export default function OtherServicesPage() {
  const [loading, setLoading] = useState(true)
  const [storeId, setStoreId] = useState('')

  const [baseServices, setBaseServices] = useState<BaseService[]>([])
  const [storeServices, setStoreServices] = useState<StoreService[]>([])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<StoreService | null>(null)

  const [formData, setFormData] = useState({
    baseServiceId: '',
    sellingPrice: '',
    active: true,
  })

  const availableBaseServices = useMemo(() => {
    if (editingService) return baseServices

    const selectedIds = new Set(storeServices.map((svc) => svc.online_services?.id).filter(Boolean))
    return baseServices.filter((svc) => !selectedIds.has(svc.id))
  }, [baseServices, editingService, storeServices])

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

    const [servicesResponse, { data: configured, error: configuredError }] = await Promise.all([
      fetch('/api/services/active', { method: 'GET' }),
      supabase.client
        .from('agent_store_service_prices')
        .select('id,selling_price,is_active,online_services(id,name,category,agent_price,description,image_url)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),
    ])

    const servicesPayload = (await servicesResponse.json().catch(() => null)) as
      | { success?: boolean; data?: BaseService[]; error?: string }
      | null

    if (!servicesResponse.ok || !servicesPayload?.success) {
      toast.error(servicesPayload?.error || 'Unable to load services list')
      setLoading(false)
      return
    }

    if (configuredError) {
      toast.error(configuredError.message)
      setLoading(false)
      return
    }

    let serviceFloors: Record<string, number> = {}
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (token) {
        const floorsRes = await fetch('/api/dashboard/subagent-pricing', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const floorsJson = (await floorsRes.json().catch(() => null)) as {
          success?: boolean
          data?: { serviceFloors?: Record<string, number> }
        }
        if (floorsRes.ok && floorsJson?.success) {
          serviceFloors = floorsJson.data?.serviceFloors || {}
        }
      }
    } catch {
      // keep platform agent_price
    }

    const applyFloor = (svc: BaseService) => ({
      ...svc,
      agent_price: Number(serviceFloors[svc.id] ?? svc.agent_price ?? 0),
    })

    setBaseServices((servicesPayload.data ?? []).map(applyFloor))
    setStoreServices(
      ((configured as StoreService[] | null) ?? []).map((row) =>
        row.online_services ? { ...row, online_services: applyFloor(row.online_services) } : row
      )
    )
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const channel = supabase.client
      .channel(`dashboard-other-services-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_services' }, () => {
        void loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_store_service_prices' }, () => {
        void loadData()
      })
      .subscribe()

    return () => {
      void supabase.client.removeChannel(channel)
    }
  }, [])

  const resetForm = () => {
    setFormData({
      baseServiceId: '',
      sellingPrice: '',
      active: true,
    })
    setEditingService(null)
  }

  const handleOpenDialog = (service?: StoreService) => {
    if (service) {
      setEditingService(service)
      setFormData({
        baseServiceId: service.online_services?.id || '',
        sellingPrice: service.selling_price.toString(),
        active: service.is_active,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!storeId || !formData.baseServiceId || !formData.sellingPrice) {
      toast.error('Please fill in all fields')
      return
    }

    const sellingPrice = Number.parseFloat(formData.sellingPrice)
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      toast.error('Selling price must be greater than zero')
      return
    }

    if (editingService) {
      const { error } = await supabase.client
        .from('agent_store_service_prices')
        .update({
          selling_price: sellingPrice,
          is_active: formData.active,
        })
        .eq('id', editingService.id)

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Service updated successfully')
    } else {
      const { error } = await supabase.client
        .from('agent_store_service_prices')
        .insert({
          store_id: storeId,
          service_id: formData.baseServiceId,
          selling_price: sellingPrice,
          is_active: formData.active,
        })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Service added successfully')
    }

    setIsDialogOpen(false)
    resetForm()
    await loadData()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.client
      .from('agent_store_service_prices')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Service removed')
    await loadData()
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.client
      .from('agent_store_service_prices')
      .update({ is_active: active })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Service ${active ? 'activated' : 'deactivated'}`)
    await loadData()
  }

  const margin = (sellingPrice: number, basePrice: number) => sellingPrice - basePrice

  if (loading) return <FlashPageLoader />

  return (
    <DashboardPageShell
      title="Store Service Pricing"
      description="Add profit to platform services and publish them on your agent store for customers to buy."
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
              <DialogDescription>
                {editingService ? 'Update this service pricing' : 'Pick a service and set your selling price'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  value={formData.baseServiceId}
                  onValueChange={(value) => setFormData({ ...formData, baseServiceId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBaseServices.map((svc) => (
                      <SelectItem key={svc.id} value={svc.id}>
                        {svc.category} - {svc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">Selling Price (GHc)</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()}>{editingService ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <DashboardPanel title={`Store Services (${storeServices.length})`}>
          {storeServices.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No services configured yet.</p>
          ) : (
            <div className="space-y-3">
              {storeServices.map((svc) => (
                <div key={svc.id} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/[0.02]">
                  {svc.online_services?.image_url ? (
                    <img
                      src={svc.online_services.image_url}
                      alt={svc.online_services.name}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : null}
                  <div className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{svc.online_services?.name}</p>
                        <Badge variant="secondary">{svc.online_services?.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{svc.online_services?.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={svc.is_active}
                        onCheckedChange={(checked) => void handleToggleActive(svc.id, checked)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(svc)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => void handleDelete(svc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Base Price</p>
                      <p className="font-medium">GHc {Number(svc.online_services?.agent_price || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Selling Price</p>
                      <p className="font-semibold">GHc {Number(svc.selling_price).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Margin</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        GHc {margin(Number(svc.selling_price), Number(svc.online_services?.agent_price || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </DashboardPanel>
    </motion.div>
    </DashboardPageShell>
  )
}
