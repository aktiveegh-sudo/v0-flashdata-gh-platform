'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type SiteSettingsRow = {
  id: number
  site_name: string
  logo_url: string | null
  hero_text: string | null
  contact_email: string | null
  contact_phone: string | null
  maintenance_mode: boolean
}

const defaultState = {
  id: 1,
  site_name: 'FlashData GH',
  logo_url: '',
  hero_text: '',
  contact_email: '',
  contact_phone: '',
  maintenance_mode: false,
}

export default function AdminSiteSettingsPage() {
  const [form, setForm] = useState(defaultState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadSettings = async () => {
    setLoading(true)

    const { data, error } = await supabase.client
      .from('site_settings')
      .select('id,site_name,logo_url,hero_text,contact_email,contact_phone,maintenance_mode')
      .limit(1)
      .maybeSingle()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      const { data: inserted, error: insertError } = await supabase.client
        .from('site_settings')
        .insert({
          id: 1,
          site_name: 'FlashData GH',
          logo_url: '',
          hero_text: 'Welcome to FlashData GH',
          contact_email: 'support@flashdatagh.com',
          contact_phone: null,
          maintenance_mode: false,
        })
        .select('id,site_name,logo_url,hero_text,contact_email,contact_phone,maintenance_mode')
        .single()

      if (insertError || !inserted) {
        toast.error(insertError?.message || 'Failed to initialize settings')
        setLoading(false)
        return
      }

      setForm({
        id: inserted.id,
        site_name: inserted.site_name,
        logo_url: inserted.logo_url || '',
        hero_text: inserted.hero_text || '',
        contact_email: inserted.contact_email || '',
        contact_phone: inserted.contact_phone || '',
        maintenance_mode: !!inserted.maintenance_mode,
      })

      setLoading(false)
      return
    }

    const row = data as SiteSettingsRow
    setForm({
      id: row.id,
      site_name: row.site_name,
      logo_url: row.logo_url || '',
      hero_text: row.hero_text || '',
      contact_email: row.contact_email || '',
      contact_phone: row.contact_phone || '',
      maintenance_mode: !!row.maintenance_mode,
    })

    setLoading(false)
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const payload = {
      site_name: form.site_name,
      logo_url: form.logo_url || null,
      hero_text: form.hero_text || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      maintenance_mode: form.maintenance_mode,
      updated_at: new Date().toISOString(),
    }

    if (!payload.site_name) {
      toast.error('Please provide a valid site name')
      setSaving(false)
      return
    }

    const { error } = await supabase.client.from('site_settings').update(payload).eq('id', form.id)
    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    toast.success('Settings saved')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Settings</h1>
        <p className="text-sm text-muted-foreground">Manage global platform configuration from a single record.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          ) : (
            <form onSubmit={saveSettings} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Site Name</Label>
                <Input value={form.site_name} onChange={(e) => setForm((prev) => ({ ...prev, site_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input value={form.logo_url} onChange={(e) => setForm((prev) => ({ ...prev, logo_url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Hero Text</Label>
                <Textarea value={form.hero_text} onChange={(e) => setForm((prev) => ({ ...prev, hero_text: e.target.value }))} rows={4} />
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">When enabled, user actions can be restricted by frontend checks.</p>
                </div>
                <Switch checked={form.maintenance_mode} onCheckedChange={(value) => setForm((prev) => ({ ...prev, maintenance_mode: value }))} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
