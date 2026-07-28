'use client'

import { useEffect, useState } from 'react'
import { Phone, Wallet, Loader2 } from 'lucide-react'
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
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const NETWORKS = ['MTN', 'Airtel-Tigo', 'Telecel'] as const

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

export default function BuyAirtimePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [network, setNetwork] = useState<string>(NETWORKS[0])
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user?.id
      if (!uid) {
        setError('Please login again')
      } else {
        setUserId(uid)
      }
      setLoading(false)
    }
    void init()
  }, [])

  const getAuthHeaders = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token || ''
    if (!accessToken) {
      throw new Error('Please login again')
    }
    return { Authorization: `Bearer ${accessToken}` }
  }

  const handlePurchase = async () => {
    const normalizedPhone = normalizeToGhanaPhone(phone)
    const parsedAmount = Number(amount)

    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1 || parsedAmount > 500) {
      toast.error('Enter an amount between GHc 1 and GHc 500')
      return
    }
    if (!userId) {
      toast.error('Please login again')
      return
    }

    setSubmitting(true)

    try {
      const authHeaders = await getAuthHeaders()
      const response = await fetch('/api/dashboard/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          flow: 'airtime',
          phone: normalizedPhone,
          network,
          amount: parsedAmount,
        }),
      })

      const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string }
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Unable to process airtime purchase')
      }

      toast.success(`Airtime purchase submitted — GHc ${parsedAmount.toFixed(2)} ${network}`)
      setPhone('')
      setAmount('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="Buy Airtime" description="Top up airtime from your wallet.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="Buy Airtime"
      description="Send airtime instantly — select network, amount, and recipient number."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Airtime Purchase">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GHc)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                max={500}
                step={0.5}
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

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

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-white/50">Total</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  GHc {(Number(amount) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              onClick={() => void handlePurchase()}
              disabled={submitting || !phone || !amount}
              className="w-full bg-amber-400 text-black hover:bg-amber-300"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Buy with Wallet
                </>
              )}
            </Button>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Quick Amounts">
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 20, 50, 100, 200].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={`rounded-xl border px-3 py-3 text-sm font-bold transition-all ${
                  amount === String(preset)
                    ? 'border-amber-400 bg-amber-400 text-black'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-amber-400/50 dark:border-white/10 dark:bg-[#0a0a0f] dark:text-white'
                }`}
              >
                GHc {preset}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-white/45">
            Airtime is delivered to the recipient number within minutes after wallet confirmation.
          </p>
        </DashboardPanel>
      </div>
    </DashboardPageShell>
  )
}
