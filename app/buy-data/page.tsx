'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { supabase } from '@/lib/supabase/client'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

type PublicPackage = {
  id: string
  network: string
  name: string
  amount: string
  public_price: number
  selling_price?: number
  is_active: boolean
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

const networkTheme: Record<string, string> = {
  MTN: 'border-yellow-300 bg-yellow-300 text-black',
  Telecel: 'border-red-300 bg-red-500 text-white',
  'Airtel-Tigo': 'border-blue-300 bg-blue-600 text-white',
  AFA: 'border-zinc-500 bg-zinc-700 text-white',
}

export default function PublicBuyDataPage() {
  const [packages, setPackages] = useState<PublicPackage[]>([])
  const [activeNetwork, setActiveNetwork] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<PublicPackage | null>(null)
  const [open, setOpen] = useState(false)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [afaFullName, setAfaFullName] = useState('')
  const [afaGhanaCardNumber, setAfaGhanaCardNumber] = useState('')
  const [afaLocation, setAfaLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.client
        .from('data_packages')
        .select('id,network,name,amount,public_price,is_active')
        .eq('is_active', true)
        .order('network', { ascending: true })
        .order('public_price', { ascending: true })

      const list = (((data as PublicPackage[] | null) || []).map((item) => ({
        ...item,
        public_price: Number(item.public_price || item.selling_price || 0),
      })))

      setPackages(list)
      setActiveNetwork(list.find((pkg) => pkg.network)?.network || '')
      setLoading(false)
    }

    void load()
  }, [])

  const networks = useMemo(() => {
    const uniq = new Set<string>()
    for (const pkg of packages) {
      if (pkg.network) uniq.add(pkg.network)
    }
    return Array.from(uniq)
  }, [packages])

  const filtered = useMemo(() => {
    if (!activeNetwork) return packages
    return packages.filter((pkg) => pkg.network === activeNetwork)
  }, [activeNetwork, packages])

  const isAfa = (selectedPackage?.network || '').toUpperCase() === 'AFA'

  const openCheckout = (pkg: PublicPackage) => {
    setSelectedPackage(pkg)
    setRecipientPhone('')
    setAfaFullName('')
    setAfaGhanaCardNumber('')
    setAfaLocation('')
    setOpen(true)
  }

  const submit = async () => {
    if (!selectedPackage) return
    if (!recipientPhone.trim()) {
      toast.error('Please enter recipient phone')
      return
    }

    if (isAfa) {
      if (!afaFullName.trim() || !afaLocation.trim()) {
        toast.error('Please complete AFA details')
        return
      }
      const ghanaCardPattern = /^GHA-\d{9}-\d$/i
      if (!ghanaCardPattern.test(afaGhanaCardNumber.trim())) {
        toast.error('Enter valid Ghana Card Number (GHA-123456789-1)')
        return
      }
    }

    setSubmitting(true)
    try {
      await startPaystackCheckout({
        flow: isAfa ? 'public_afa' : 'public_data',
        packageId: selectedPackage.id,
        phone: recipientPhone.trim(),
        fullName: isAfa ? afaFullName.trim() : undefined,
        ghanaCardNumber: isAfa ? afaGhanaCardNumber.trim().toUpperCase() : undefined,
        location: isAfa ? afaLocation.trim() : undefined,
        redirectPath: '/buy-data',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start checkout')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <MainSiteShell activeTab="products">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading packages...</div>
        </div>
      </MainSiteShell>
    )
  }

  if (packages.length === 0) {
    return (
      <MainSiteShell activeTab="products">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="max-w-md border-yellow-300/20 bg-zinc-950/80 text-zinc-100"><CardContent className="p-6 text-center">No active public packages available yet.</CardContent></Card>
        </div>
      </MainSiteShell>
    )
  }

  return (
    <MainSiteShell activeTab="products">
      <section className="rounded-3xl border border-yellow-300/20 bg-[#0a1223] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Buy Data Bundles</p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-5xl">No account needed. Pay via Momo.</h1>
      </section>

      <section className="mt-4 space-y-3">
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Important: No duplicate orders</p>
          <p className="mt-1 text-xs text-amber-100/90">Placing more than one order for the same phone number within 5 minutes may cause rejection.</p>
        </div>

        <div className="rounded-2xl border border-violet-300/30 bg-gradient-to-r from-violet-600/30 to-indigo-500/30 p-4 text-sm text-violet-100">
          <p className="flex items-center gap-2 font-semibold"><Search className="h-4 w-4" /> Track your order</p>
          <p className="mt-1 text-xs text-violet-100/90">Check delivery status by phone or reference in your latest order updates.</p>
        </div>

        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Deliveries are moving well</p>
          <p className="mt-1 text-xs text-emerald-100/90">Expect your order within the hour for most bundles.</p>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {networks.map((network) => (
          <Button
            key={network}
            variant={activeNetwork === network ? 'default' : 'outline'}
            className={activeNetwork === network
              ? 'rounded-full bg-yellow-300 px-5 text-xs font-semibold uppercase tracking-[0.11em] text-black hover:bg-yellow-200'
              : 'rounded-full border-yellow-300/35 bg-transparent px-5 text-xs font-semibold uppercase tracking-[0.11em] text-zinc-200 hover:bg-yellow-300/10'}
            onClick={() => setActiveNetwork(network)}
          >
            {network}
          </Button>
        ))}
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((pkg) => (
          <Card key={pkg.id} className="rounded-2xl border border-yellow-300/25 bg-yellow-300 text-black">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/80">{pkg.network}</p>
                <div className={`rounded-full border px-2 py-1 text-[10px] font-bold ${networkTheme[pkg.network] || 'border-black/20 bg-white/40 text-black'}`}>
                  {pkg.amount}
                </div>
              </div>
              <h2 className="text-3xl font-black">{pkg.name}</h2>
              <p className="text-xs uppercase tracking-[0.1em] text-black/70">MTN Bundle</p>
              <p className="text-3xl font-black">{formatGhs(pkg.public_price)}</p>
              <Button className="w-full rounded-full bg-black text-yellow-300 hover:bg-zinc-900" onClick={() => openCheckout(pkg)}>
                Buy
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-yellow-300/25 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{isAfa ? 'Complete AFA registration' : 'Complete your data order'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0241234567" className="border-yellow-300/25 bg-zinc-900" />
            </div>
            {isAfa ? (
              <>
                <div className="space-y-2"><Label>Full Name</Label><Input className="border-yellow-300/25 bg-zinc-900" value={afaFullName} onChange={(e) => setAfaFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Ghana Card Number</Label><Input className="border-yellow-300/25 bg-zinc-900" value={afaGhanaCardNumber} onChange={(e) => setAfaGhanaCardNumber(e.target.value.toUpperCase())} placeholder="GHA-123456789-1" /></div>
                <div className="space-y-2"><Label>Location</Label><Input className="border-yellow-300/25 bg-zinc-900" value={afaLocation} onChange={(e) => setAfaLocation(e.target.value)} /></div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-yellow-300/35 bg-transparent text-zinc-100 hover:bg-yellow-300/10" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-yellow-300 text-black hover:bg-yellow-200" onClick={() => void submit()} disabled={submitting}>{submitting ? 'Processing...' : 'Proceed to Pay'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainSiteShell>
  )
}
