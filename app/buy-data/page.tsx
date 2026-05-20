'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

type PublicPackage = {
  id: string
  network: string
  name: string
  amount: string
  user_price: number
  selling_price?: number
  is_active: boolean
}

const formatGhs = (value: number) => `GHc ${Number(value || 0).toFixed(2)}`

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
        .select('id,network,name,amount,user_price,is_active')
        .eq('is_active', true)
        .order('network', { ascending: true })
        .order('user_price', { ascending: true })

      const list = (((data as PublicPackage[] | null) || []).map((item) => ({
        ...item,
        user_price: Number(item.user_price || item.selling_price || 0),
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-zinc-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading packages...</div>
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <Card className="max-w-md"><CardContent className="p-6 text-center">No active public packages available yet.</CardContent></Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Public Buy Data</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-900 sm:text-4xl">Buy Data Without Account</h1>
          <p className="mt-2 text-zinc-600">Packages shown here are activated by admin for public users.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {networks.map((network) => (
            <Button key={network} variant={activeNetwork === network ? 'default' : 'outline'} className="rounded-xl" onClick={() => setActiveNetwork(network)}>
              {network}
            </Button>
          ))}
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => (
            <Card key={pkg.id} className="rounded-2xl border-zinc-200">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-semibold text-zinc-500">{pkg.network}</p>
                <h2 className="text-lg font-bold text-zinc-900">{pkg.name}</h2>
                <p className="text-sm text-zinc-600">{pkg.amount}</p>
                <p className="text-xl font-black text-sky-700">{formatGhs(pkg.user_price)}</p>
                <Button className="w-full rounded-xl" onClick={() => openCheckout(pkg)}>Buy Now</Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAfa ? 'Complete AFA registration' : 'Complete your data order'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="0241234567" />
            </div>
            {isAfa ? (
              <>
                <div className="space-y-2"><Label>Full Name</Label><Input value={afaFullName} onChange={(e) => setAfaFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Ghana Card Number</Label><Input value={afaGhanaCardNumber} onChange={(e) => setAfaGhanaCardNumber(e.target.value.toUpperCase())} placeholder="GHA-123456789-1" /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={afaLocation} onChange={(e) => setAfaLocation(e.target.value)} /></div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void submit()} disabled={submitting}>{submitting ? 'Processing...' : 'Proceed to Pay'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
