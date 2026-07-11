'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flag, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel } from '@/components/admin/page-shell'
import { fetchSiteSettingsAdmin } from '@/lib/admin/admin-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type FlagDef = {
  key: string
  label: string
  description: string
  type: 'boolean' | 'select'
  options?: Array<{ value: string; label: string }>
}

const FLAGS: FlagDef[] = [
  {
    key: 'maintenance_mode',
    label: 'Maintenance Mode',
    description: 'Restrict user actions when the platform is under maintenance.',
    type: 'boolean',
  },
  {
    key: 'order_notifications_enabled',
    label: 'Order Notifications',
    description: 'Notify admins when new orders or registrations are created.',
    type: 'boolean',
  },
  {
    key: 'show_announcement',
    label: 'Show Announcement',
    description: 'Display the promo banner on user dashboards.',
    type: 'boolean',
  },
  {
    key: 'delivery_provider',
    label: 'Delivery Provider',
    description: 'Active data delivery provider for paid orders.',
    type: 'select',
    options: [
      { value: 'swiftdata', label: 'Swift Reseller (Primary)' },
      { value: 'secondary', label: 'Secondary Provider' },
    ],
  },
]

export default function AdminFeatureFlagsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState(1)
  const [values, setValues] = useState<Record<string, boolean | string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSiteSettingsAdmin()
      setSettingsId(Number(data.id) || 1)
      setValues({
        maintenance_mode: !!data.maintenance_mode,
        order_notifications_enabled: !!data.order_notifications_enabled,
        show_announcement: !!data.show_announcement,
        delivery_provider: data.delivery_provider === 'secondary' ? 'secondary' : 'swiftdata',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load flags')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.client
      .from('site_settings')
      .update({
        maintenance_mode: !!values.maintenance_mode,
        order_notifications_enabled: !!values.order_notifications_enabled,
        show_announcement: !!values.show_announcement,
        delivery_provider: values.delivery_provider === 'secondary' ? 'secondary' : 'swiftdata',
        updated_at: new Date().toISOString(),
      })
      .eq('id', settingsId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Feature flags saved')
    }
    setSaving(false)
  }

  if (loading) return <FlashPageLoader />

  return (
    <AdminPageShell
      title="Feature Flags"
      description="Toggle platform features stored in site settings."
      actions={
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      }
    >
      <AdminPanel title="Active Flags" description="Changes apply immediately after saving">
        <div className="space-y-4">
          {FLAGS.map((flag) => (
            <div
              key={flag.key}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 dark:border-white/5"
            >
              <div className="flex items-start gap-3">
                <Flag className="mt-0.5 h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{flag.label}</p>
                  <p className="text-sm text-gray-500 dark:text-white/50">{flag.description}</p>
                </div>
              </div>
              {flag.type === 'boolean' ? (
                <Switch
                  checked={!!values[flag.key]}
                  onCheckedChange={(v) => setValues((prev) => ({ ...prev, [flag.key]: v }))}
                />
              ) : (
                <div className="w-48">
                  <Label className="sr-only">{flag.label}</Label>
                  <Select
                    value={String(values[flag.key] || 'swiftdata')}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [flag.key]: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {flag.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>
      </AdminPanel>
    </AdminPageShell>
  )
}
