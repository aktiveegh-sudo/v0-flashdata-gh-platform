'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Clock, Loader2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DashboardPageShell,
  DashboardPanel,
  DashboardStatGrid,
  DashboardStatCard,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchScheduledOrders } from '@/lib/dashboard/agent-pages-data'
import { compareNetworks, sortNetworks } from '@/lib/network-order'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type DataPackageRow = {
  id: string
  network: string
  amount: string
  agent_price: number
}

type ScheduledOrderRow = {
  id: string
  amount: number
  status: string
  created_at: string
  metadata: { scheduled_for?: string; phone?: string; package_label?: string } | null
}

const normalizeToGhanaPhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('233')) return `+${digits}`
  if (value.trim().startsWith('+233') && digits.length === 12) return `+${digits}`
  return null
}

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
}

export default function SchedulePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [packages, setPackages] = useState<DataPackageRow[]>([])
  const [scheduled, setScheduled] = useState<ScheduledOrderRow[]>([])
  const [phone, setPhone] = useState('')
  const [packageId, setPackageId] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadScheduled = async (uid: string) => {
    const rows = await fetchScheduledOrders(uid)
    setScheduled(rows as ScheduledOrderRow[])
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user?.id
      if (!uid) {
        setError('Please login again')
        setLoading(false)
        return
      }

      setUserId(uid)

      const { data: pkgData, error: pkgError } = await supabase.client
        .from('data_packages')
        .select('id,network,amount,agent_price,selling_price')
        .eq('is_active', true)

      if (pkgError) {
        setError(pkgError.message)
        setLoading(false)
        return
      }

      const rows = ((pkgData as DataPackageRow[] | null) || [])
        .map((row) => ({ ...row, agent_price: Number(row.agent_price || 0) }))
        .sort((a, b) => compareNetworks(a.network, b.network))

      setPackages(rows)
      await loadScheduled(uid)
      setLoading(false)
    }

    void init()
  }, [])

  const packageOptions = useMemo(
    () =>
      packages.map((pkg) => ({
        ...pkg,
        label: `${pkg.network} ${pkg.amount} — GHc ${pkg.agent_price.toFixed(2)}`,
      })),
    [packages]
  )

  const selectedPackage = packages.find((p) => p.id === packageId)

  const handleSave = async () => {
    const normalizedPhone = normalizeToGhanaPhone(phone)
    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }
    if (!selectedPackage) {
      toast.error('Select a data package')
      return
    }
    if (!scheduledFor) {
      toast.error('Pick a date and time')
      return
    }
    if (new Date(scheduledFor) <= new Date()) {
      toast.error('Scheduled time must be in the future')
      return
    }
    if (!userId) return

    setSaving(true)

    const reference = `SCH-${Date.now()}`
    const { error: insertError } = await supabase.client.from('orders').insert({
      user_id: userId,
      package_id: selectedPackage.id,
      phone: normalizedPhone,
      amount: selectedPackage.agent_price,
      status: 'pending',
      reference,
      metadata: {
        scheduled_for: new Date(scheduledFor).toISOString(),
        phone: normalizedPhone,
        package_label: `${selectedPackage.network} ${selectedPackage.amount}`,
        source: 'dashboard_schedule',
      },
    })

    setSaving(false)

    if (insertError) {
      toast.error(insertError.message)
      return
    }

    toast.success('Order scheduled successfully')
    setPhone('')
    setPackageId('')
    setScheduledFor('')
    await loadScheduled(userId)
  }

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Schedule Orders" description="Queue data orders for a future date and time.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Schedule Orders"
      description="Set up future data deliveries — orders run automatically at the scheduled time."
      stats={
        <DashboardStatGrid>
          <DashboardStatCard label="Scheduled" value={String(scheduled.length)} icon={CalendarClock} />
          <DashboardStatCard
            label="Next Run"
            value={
              scheduled[0]?.metadata?.scheduled_for
                ? format(new Date(scheduled[0].metadata.scheduled_for), 'MMM d')
                : '—'
            }
            hint={
              scheduled[0]?.metadata?.scheduled_for
                ? format(new Date(scheduled[0].metadata.scheduled_for), 'h:mm a')
                : 'No upcoming'
            }
            icon={Clock}
          />
        </DashboardStatGrid>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="New Scheduled Order">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Recipient Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="024 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Package</Label>
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {packageOptions.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datetime">Date & Time</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>

            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full bg-amber-400 text-black hover:bg-amber-300"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Schedule Order'
              )}
            </Button>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Scheduled Queue" description="Orders waiting for their run time.">
          {scheduled.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-white/50">No scheduled orders yet.</p>
          ) : (
            <div className="space-y-3">
              {scheduled.map((order) => {
                const meta = order.metadata
                return (
                  <div
                    key={order.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {meta?.package_label || 'Data order'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-white/45">
                        {meta?.phone || '—'} · GHc {Number(order.amount).toFixed(2)}
                      </p>
                      {meta?.scheduled_for ? (
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                          {format(new Date(meta.scheduled_for), 'MMM d, yyyy · h:mm a')}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="capitalize w-fit">
                      {order.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </DashboardPanel>
      </div>
    </DashboardPageShell>
  )
}
