'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/admin/utils'
import toast from 'react-hot-toast'

type AfaSettings = {
  id: number
  base_price: number
  is_active: boolean
  instructions: string | null
}

type AfaRegistration = {
  id: string
  user_id: string
  full_name: string
  phone: string
  ghana_card_number: string
  location: string
  amount: number
  reference: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  admin_note: string | null
  created_at: string
  profiles?: {
    full_name: string | null
    phone: string | null
  } | null
}

const statusOptions: AfaRegistration['status'][] = ['pending', 'processing', 'completed', 'rejected']

export default function AdminAfaPage() {
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [rows, setRows] = useState<AfaRegistration[]>([])
  const [settings, setSettings] = useState<AfaSettings>({ id: 1, base_price: 0, is_active: true, instructions: '' })

  const loadData = async () => {
    setLoading(true)

    const [{ data: settingsData, error: settingsError }, { data: registrations, error: registrationsError }] = await Promise.all([
      supabase.client
        .from('afa_settings')
        .select('id,base_price,is_active,instructions')
        .eq('id', 1)
        .maybeSingle(),
      supabase.client
        .from('afa_registrations')
        .select('id,user_id,full_name,phone,ghana_card_number,location,amount,reference,status,admin_note,created_at,profiles(full_name,phone)')
        .order('created_at', { ascending: false }),
    ])

    if (settingsError) {
      toast.error(settingsError.message)
      setLoading(false)
      return
    }

    if (registrationsError) {
      toast.error(registrationsError.message)
      setLoading(false)
      return
    }

    setSettings({
      id: settingsData?.id || 1,
      base_price: Number(settingsData?.base_price || 0),
      is_active: Boolean(settingsData?.is_active ?? true),
      instructions: settingsData?.instructions || '',
    })

    setRows((registrations as AfaRegistration[] | null) || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const saveSettings = async () => {
    setSavingSettings(true)

    const payload = {
      id: 1,
      base_price: Number(settings.base_price || 0),
      is_active: settings.is_active,
      instructions: settings.instructions?.trim() || null,
    }

    if (Number.isNaN(payload.base_price) || payload.base_price < 0) {
      toast.error('Base price must be valid and non-negative')
      setSavingSettings(false)
      return
    }

    const { error } = await supabase.client.from('afa_settings').upsert(payload, { onConflict: 'id' })
    setSavingSettings(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('AFA settings saved')
    await loadData()
  }

  const updateStatus = async (id: string, status: AfaRegistration['status']) => {
    const { error } = await supabase.client
      .from('afa_registrations')
      .update({ status })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)))
    toast.success('Status updated')
  }

  const updateNote = async (id: string, note: string) => {
    const { error } = await supabase.client
      .from('afa_registrations')
      .update({ admin_note: note.trim() || null })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Admin note saved')
  }

  const deleteRegistration = async (id: string) => {
    if (!window.confirm('Delete this registration?')) {
      return
    }

    const { error } = await supabase.client.from('afa_registrations').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }

    setRows((prev) => prev.filter((row) => row.id !== id))
    toast.success('Registration deleted')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AFA Control</h1>
        <p className="text-sm text-muted-foreground">Manage AFA pricing, availability, and user registrations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AFA Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Base Price (GHc)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={settings.base_price}
              onChange={(e) => setSettings((prev) => ({ ...prev, base_price: Number(e.target.value) }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">AFA Active</p>
              <p className="text-xs text-muted-foreground">Allow users to submit new registrations</p>
            </div>
            <Switch checked={settings.is_active} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, is_active: value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Instructions</Label>
            <Textarea
              rows={3}
              value={settings.instructions || ''}
              onChange={(e) => setSettings((prev) => ({ ...prev, instructions: e.target.value }))}
              placeholder="Provide any instructions users must follow before payment"
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={() => void saveSettings()} disabled={savingSettings}>
              {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save AFA Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrations ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading registrations...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AFA registrations yet.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{row.full_name}</p>
                    <p className="text-xs text-muted-foreground">Ref: {row.reference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">GHc {Number(row.amount || 0).toFixed(2)}</Badge>
                    <Select value={row.status} onValueChange={(value) => void updateStatus(row.id, value as AfaRegistration['status'])}>
                      <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="destructive" size="sm" onClick={() => void deleteRegistration(row.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <p>Phone: {row.phone}</p>
                  <p>Ghana Card: {row.ghana_card_number}</p>
                  <p>Location: {row.location}</p>
                  <p>Submitted: {formatDateTime(row.created_at)}</p>
                  <p className="md:col-span-2">User: {row.profiles?.full_name || row.user_id} {row.profiles?.phone ? `(${row.profiles.phone})` : ''}</p>
                </div>

                <div className="mt-3 space-y-2">
                  <Label>Admin Note</Label>
                  <Textarea
                    defaultValue={row.admin_note || ''}
                    rows={2}
                    onBlur={(e) => {
                      if ((e.target.value || '') !== (row.admin_note || '')) {
                        void updateNote(row.id, e.target.value)
                      }
                    }}
                    placeholder="Optional note for internal follow-up"
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
