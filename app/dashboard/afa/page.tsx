'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { useWalletStore, useTransactionStore, useLoadingStore } from '@/lib/store'
import { startPaystackCheckout } from '@/lib/paystack/client'
import toast from 'react-hot-toast'

type AfaSettings = {
  base_price: number
  is_active: boolean
  instructions: string | null
}

type AfaRegistrationRow = {
  id: string
  full_name: string
  phone: string
  ghana_card_number: string
  location: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  created_at: string
}

const normalizePhone = (value: string): string | null => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('233')) return `+${digits}`
  if (value.trim().startsWith('+233') && digits.length === 12) return `+${digits}`
  return null
}

export default function AfaPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [settings, setSettings] = useState<AfaSettings>({ base_price: 0, is_active: true, instructions: '' })
  const [rows, setRows] = useState<AfaRegistrationRow[]>([])

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [ghanaCardNumber, setGhanaCardNumber] = useState('')
  const [location, setLocation] = useState('')
  const [paystackLoading, setPaystackLoading] = useState(false)

  const { balance, deductFunds } = useWalletStore()
  const { addTransaction } = useTransactionStore()
  const { setLoading: setGlobalLoading } = useLoadingStore()

  const canPay = useMemo(() => balance >= Number(settings.base_price || 0), [balance, settings.base_price])

  const loadData = async () => {
    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      toast.error('Please login again')
      setLoading(false)
      return
    }

    const [{ data: settingsData, error: settingsError }, { data: registrations, error: registrationError }] = await Promise.all([
      supabase.client
        .from('afa_settings')
        .select('base_price,is_active,instructions')
        .eq('id', 1)
        .maybeSingle(),
      supabase.client
        .from('afa_registrations')
        .select('id,full_name,phone,ghana_card_number,location,amount,status,created_at')
        .eq('user_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (settingsError) {
      toast.error(settingsError.message)
      setLoading(false)
      return
    }

    if (registrationError) {
      toast.error(registrationError.message)
      setLoading(false)
      return
    }

    setSettings({
      base_price: Number(settingsData?.base_price || 0),
      is_active: Boolean(settingsData?.is_active ?? true),
      instructions: settingsData?.instructions || null,
    })

    setRows((registrations as AfaRegistrationRow[] | null) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const submitRegistration = async () => {
    if (!settings.is_active) {
      toast.error('AFA registration is currently disabled')
      return
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }

    if (!fullName.trim()) {
      toast.error('Full name is required')
      return
    }

    const ghanaCardPattern = /^GHA-\d{9}-\d$/i
    if (!ghanaCardPattern.test(ghanaCardNumber.trim())) {
      toast.error('Use Ghana Card format: GHA-123456789-1')
      return
    }

    if (!location.trim()) {
      toast.error('Location is required')
      return
    }

    if (!canPay) {
      toast.error('Insufficient wallet balance')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      toast.error('Please login again')
      return
    }

    setSubmitting(true)
    setGlobalLoading(true)

    const reference = `AFA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const { error } = await supabase.client.from('afa_registrations').insert({
      user_id: authData.user.id,
      full_name: fullName.trim(),
      phone: normalizedPhone,
      ghana_card_number: ghanaCardNumber.trim().toUpperCase(),
      location: location.trim(),
      amount: Number(settings.base_price || 0),
      reference,
      status: 'pending',
    })

    if (error) {
      setSubmitting(false)
      setGlobalLoading(false)
      toast.error(error.message || 'Could not submit AFA registration')
      return
    }

    const debited = deductFunds(Number(settings.base_price || 0))
    if (debited) {
      addTransaction({
        type: 'bill',
        network: 'AFA',
        amount: Number(settings.base_price || 0),
        phone: normalizedPhone,
        status: 'pending',
        reference,
        description: 'AFA Registration',
      })
    }

    toast.success('AFA registration submitted successfully')

    setFullName('')
    setPhone('')
    setGhanaCardNumber('')
    setLocation('')
    setSubmitting(false)
    setGlobalLoading(false)
    await loadData()
  }

  const payWithPaystack = async () => {
    if (!settings.is_active) {
      toast.error('AFA registration is currently disabled')
      return
    }

    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone) {
      toast.error('Enter a valid Ghana phone number')
      return
    }

    if (!fullName.trim() || !location.trim()) {
      toast.error('Full name and location are required')
      return
    }

    const ghanaCardPattern = /^GHA-\d{9}-\d$/i
    if (!ghanaCardPattern.test(ghanaCardNumber.trim())) {
      toast.error('Use Ghana Card format: GHA-123456789-1')
      return
    }

    setPaystackLoading(true)
    setGlobalLoading(true)

    try {
      await startPaystackCheckout({
        flow: 'dashboard_afa',
        phone: normalizedPhone,
        fullName: fullName.trim(),
        ghanaCardNumber: ghanaCardNumber.trim().toUpperCase(),
        location: location.trim(),
        redirectPath: '/dashboard/afa',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to start Paystack payment')
      setPaystackLoading(false)
      setGlobalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading AFA...
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">AFA Registration</h1>
        <p className="text-muted-foreground">Submit your details and pay the admin-configured registration fee.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Register for AFA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings.is_active ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              AFA registration is currently disabled by admin.
            </div>
          ) : null}

          {settings.instructions ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {settings.instructions}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 123 4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ghana-card">Ghana Card Number</Label>
              <Input id="ghana-card" value={ghanaCardNumber} onChange={(e) => setGhanaCardNumber(e.target.value.toUpperCase())} placeholder="GHA-123456789-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Accra, Ghana" />
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Registration Fee</span>
              <span className="font-semibold">GHc {Number(settings.base_price || 0).toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Wallet Balance</span>
              <span className={`font-semibold ${canPay ? 'text-foreground' : 'text-destructive'}`}>GHc {balance.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => void submitRegistration()} className="w-full" disabled={submitting || paystackLoading || !settings.is_active || !canPay}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay with Wallet
            </Button>
            <Button variant="outline" onClick={() => void payWithPaystack()} className="w-full" disabled={submitting || paystackLoading || !settings.is_active}>
              {paystackLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay with Paystack
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My AFA Registrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AFA registrations yet.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{row.full_name}</p>
                  <Badge variant="outline">{row.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{row.phone} • {row.ghana_card_number}</p>
                <p className="mt-1 text-sm text-muted-foreground">Location: {row.location}</p>
                <p className="mt-2 text-sm font-medium">Amount: GHc {Number(row.amount || 0).toFixed(2)}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
