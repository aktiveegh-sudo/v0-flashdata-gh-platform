'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers, Loader2, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { getDashboardAuthHeaders } from '@/lib/dashboard/client-auth'
import { compareNetworks, sortNetworks } from '@/lib/network-order'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type DataPackageRow = {
  id: string
  network: string
  amount: string
  agent_price: number
}

const normalizeToGhanaPhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('233')) return `+${digits}`
  if (value.trim().startsWith('+233') && digits.length === 12) return `+${digits}`
  return null
}

export default function BulkOrdersPage() {
  const [packages, setPackages] = useState<DataPackageRow[]>([])
  const [phonesText, setPhonesText] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user?.id) {
        setError('Please login again')
        setLoading(false)
        return
      }

      const { data, error: pkgError } = await supabase.client
        .from('data_packages')
        .select('id,network,amount,agent_price,selling_price')
        .eq('is_active', true)
        .order('network', { ascending: true })

      if (pkgError) {
        setError(pkgError.message)
        setLoading(false)
        return
      }

      const rows = ((data as DataPackageRow[] | null) || [])
        .map((row) => ({
          ...row,
          agent_price: Number(row.agent_price || 0),
        }))
        .sort((a, b) => {
          const networkComparison = compareNetworks(a.network, b.network)
          if (networkComparison !== 0) return networkComparison
          return a.agent_price - b.agent_price
        })

      setPackages(rows)
      const networks = sortNetworks(Array.from(new Set(rows.map((r) => r.network).filter(Boolean))))
      if (networks[0]) setSelectedNetwork(networks[0])
      setLoading(false)
    }

    void load()
  }, [])

  const networks = useMemo(
    () => sortNetworks(Array.from(new Set(packages.map((p) => p.network).filter(Boolean)))),
    [packages]
  )

  const networkPackages = useMemo(
    () => packages.filter((p) => p.network === selectedNetwork),
    [packages, selectedNetwork]
  )

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) || null,
    [packages, selectedPackageId]
  )

  const parsedPhones = useMemo(() => {
    return phonesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => normalizeToGhanaPhone(line))
      .filter((phone): phone is string => Boolean(phone))
  }, [phonesText])

  const totalCost = selectedPackage ? selectedPackage.agent_price * parsedPhones.length : 0

  const handleSubmit = async () => {
    if (!selectedPackage) {
      toast.error('Select a data package')
      return
    }
    if (parsedPhones.length === 0) {
      toast.error('Enter at least one valid Ghana phone number (one per line)')
      return
    }

    setSubmitting(true)
    let successCount = 0

    try {
      const headers = await getDashboardAuthHeaders()

      for (const phone of parsedPhones) {
        const response = await fetch('/api/dashboard/purchase', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            flow: 'data',
            packageId: selectedPackage.id,
            phone,
          }),
        })

        const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string }
        if (response.ok && result?.success) {
          successCount += 1
        }
      }

      if (successCount === parsedPhones.length) {
        toast.success(`${successCount} bulk order${successCount === 1 ? '' : 's'} submitted successfully`)
        setPhonesText('')
        setSelectedPackageId('')
      } else if (successCount > 0) {
        toast.success(`${successCount} of ${parsedPhones.length} orders submitted`)
      } else {
        toast.error('Bulk orders failed. Check wallet balance and try again.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk order failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Bulk Orders" description="Process multiple data orders at once.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Bulk Orders"
      description="Paste phone numbers (one per line), pick a package, and pay from your wallet."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Valid Numbers" value={String(parsedPhones.length)} icon={Layers} />
          <DashboardStatCard
            label="Package Price"
            value={selectedPackage ? `GHc ${selectedPackage.agent_price.toFixed(2)}` : '—'}
            icon={Wifi}
          />
          <DashboardStatCard label="Total Cost" value={`GHc ${totalCost.toFixed(2)}`} hint="Wallet deduction" />
        </DashboardStatGrid>
      }
    >
      <DashboardPanel title="Bulk Order Form">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phones">Phone Numbers</Label>
              <Textarea
                id="phones"
                rows={10}
                placeholder={'0241234567\n0559876543\n0201112233'}
                value={phonesText}
                onChange={(e) => setPhonesText(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-white/45">One Ghana number per line</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select
                value={selectedNetwork}
                onValueChange={(value) => {
                  setSelectedNetwork(value)
                  setSelectedPackageId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network} value={network}>
                      {network}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {networkPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.amount} — GHc {pkg.agent_price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Order Summary
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-white/65">
                {parsedPhones.length} recipient{parsedPhones.length === 1 ? '' : 's'} × GHc{' '}
                {(selectedPackage?.agent_price || 0).toFixed(2)}
              </p>
              <p className="mt-1 text-xl font-black text-gray-900 dark:text-white">
                GHc {totalCost.toFixed(2)}
              </p>
            </div>

            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || !selectedPackageId || parsedPhones.length === 0}
              className="w-full bg-amber-400 text-black hover:bg-amber-300"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Submit ${parsedPhones.length || 0} Order${parsedPhones.length === 1 ? '' : 's'}`
              )}
            </Button>
          </div>
        </div>
      </DashboardPanel>
    </DashboardPageShell>
  )
}
