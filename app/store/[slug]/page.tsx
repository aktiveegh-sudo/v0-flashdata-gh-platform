'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Store, Phone, Mail, MessageCircle, ShoppingCart, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type StoreProfile = {
  id: string
  brand_name: string
  slug: string
  tagline: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  theme_color: string | null
  contact_phone: string | null
  contact_email: string | null
  whatsapp_number: string | null
  allow_data: boolean
  allow_online_services: boolean
}

type StorePackage = {
  id: string
  selling_price: number
  data_packages: {
    id: string
    network: string
    name: string
    amount: string
    validity: string
  } | null
}

type StoreService = {
  id: string
  selling_price: number
  online_services: {
    id: string
    name: string
    category: string
    description: string | null
  } | null
}

export default function PublicAgentStorePage() {
  const params = useParams<{ slug: string }>()
  const slug = typeof params.slug === 'string' ? params.slug : ''

  const [loading, setLoading] = useState(true)
  const [store, setStore] = useState<StoreProfile | null>(null)
  const [packages, setPackages] = useState<StorePackage[]>([])
  const [services, setServices] = useState<StoreService[]>([])

  const [selectedData, setSelectedData] = useState<StorePackage | null>(null)
  const [selectedService, setSelectedService] = useState<StoreService | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const loadStore = async () => {
      if (!slug) {
        setLoading(false)
        return
      }

      const { data: storeData, error: storeError } = await supabase.client
        .from('agent_stores')
        .select('id,brand_name,slug,tagline,description,logo_url,cover_url,theme_color,contact_phone,contact_email,whatsapp_number,allow_data,allow_online_services')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (storeError || !storeData) {
        setStore(null)
        setLoading(false)
        return
      }

      setStore(storeData)

      const [{ data: pkgData }, { data: serviceData }] = await Promise.all([
        supabase.client
          .from('agent_store_packages')
          .select('id,selling_price,data_packages!inner(id,network,name,amount,validity)')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .order('selling_price', { ascending: true }),
        supabase.client
          .from('agent_store_service_prices')
          .select('id,selling_price,online_services!inner(id,name,category,description)')
          .eq('store_id', storeData.id)
          .eq('is_active', true)
          .order('selling_price', { ascending: true }),
      ])

      setPackages((pkgData as StorePackage[] | null) ?? [])
      setServices((serviceData as StoreService[] | null) ?? [])
      setLoading(false)
    }

    void loadStore()
  }, [slug])

  const quantityNum = useMemo(() => {
    const parsed = Number.parseInt(quantity, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }, [quantity])

  const selectedPrice = selectedData?.selling_price ?? selectedService?.selling_price ?? 0
  const totalPrice = selectedPrice * quantityNum

  const resetSelection = () => {
    setSelectedData(null)
    setSelectedService(null)
  }

  const submitOrder = async () => {
    if (!store) return
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Please add your name and phone number')
      return
    }

    if (!selectedData && !selectedService) {
      toast.error('Please select an item')
      return
    }

    setSubmitting(true)

    const payload = {
      store_id: store.id,
      item_type: selectedData ? 'data' : 'service',
      package_id: selectedData?.data_packages?.id ?? null,
      service_id: selectedService?.online_services?.id ?? null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_email: customerEmail.trim() || null,
      customer_note: customerNote.trim() || null,
      quantity: quantityNum,
      total_price: totalPrice,
      status: 'pending',
    }

    const { error } = await supabase.client.from('agent_store_orders').insert(payload)

    setSubmitting(false)

    if (error) {
      toast.error(error.message || 'Could not place order')
      return
    }

    toast.success('Order received. The agent will process it shortly.')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setCustomerNote('')
    setQuantity('1')
    resetSelection()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading store...
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Store Not Found</CardTitle>
            <CardDescription>
              This store link is invalid or currently unavailable.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          background: store.cover_url
            ? `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url(${store.cover_url}) center/cover`
            : `linear-gradient(135deg, ${store.theme_color || '#0ea5e9'} 0%, #0f172a 100%)`,
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-12 text-white lg:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Agent Store
              </p>
              <h1 className="text-3xl font-bold lg:text-4xl">{store.brand_name}</h1>
              <p className="max-w-2xl text-sm text-white/85 lg:text-base">
                {store.tagline || store.description || 'Buy data and services directly from this trusted agent.'}
              </p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <p className="font-medium">/{store.slug}</p>
              <p className="text-white/80">No login needed</p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.5fr_1fr] lg:px-6">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Available Products
              </CardTitle>
              <CardDescription>
                Select a data package or a service to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={store.allow_data ? 'data' : 'services'} className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="data" disabled={!store.allow_data}>Data</TabsTrigger>
                  <TabsTrigger value="services" disabled={!store.allow_online_services}>Services</TabsTrigger>
                </TabsList>

                <TabsContent value="data" className="space-y-3">
                  {packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No data packages available right now.</p>
                  ) : (
                    packages.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedService(null)
                          setSelectedData(item)
                        }}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          selectedData?.id === item.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {item.data_packages?.network} {item.data_packages?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.data_packages?.amount} • {item.data_packages?.validity}
                            </p>
                          </div>
                          <Badge className="bg-primary">GHc {Number(item.selling_price).toFixed(2)}</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="services" className="space-y-3">
                  {services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services available right now.</p>
                  ) : (
                    services.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedData(null)
                          setSelectedService(item)
                        }}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          selectedService?.id === item.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{item.online_services?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.online_services?.category} • {item.online_services?.description || 'Quick processing'}
                            </p>
                          </div>
                          <Badge className="bg-primary">GHc {Number(item.selling_price).toFixed(2)}</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Place Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name</Label>
                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email (optional)</Label>
                <Input id="customerEmail" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerNote">Note (optional)</Label>
                <Textarea id="customerNote" rows={3} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">Selected item</p>
                <p className="font-semibold">
                  {selectedData
                    ? `${selectedData.data_packages?.network} ${selectedData.data_packages?.name}`
                    : selectedService
                    ? selectedService.online_services?.name
                    : 'None selected'}
                </p>
                <p className="mt-1 text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-primary">GHc {totalPrice.toFixed(2)}</p>
              </div>

              <Button className="w-full" onClick={submitOrder} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Order
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {store.contact_phone ? (
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{store.contact_phone}</p>
              ) : null}
              {store.contact_email ? (
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />{store.contact_email}</p>
              ) : null}
              {store.whatsapp_number ? (
                <p className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" />{store.whatsapp_number}</p>
              ) : null}
              {!store.contact_phone && !store.contact_email && !store.whatsapp_number ? (
                <p className="text-muted-foreground">Contact details not provided.</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  )
}
