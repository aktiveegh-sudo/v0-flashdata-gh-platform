'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Megaphone, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel } from '@/components/admin/page-shell'
import { fetchSiteSettingsAdmin } from '@/lib/admin/admin-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AdminBannersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState(1)
  const [show, setShow] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSiteSettingsAdmin()
      setSettingsId(Number(data.id) || 1)
      setShow(!!data.show_announcement)
      setTitle(data.announcement_title || '')
      setMessage(data.announcement_message || '')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.client
      .from('site_settings')
      .update({
        show_announcement: show,
        announcement_title: title.trim() || null,
        announcement_message: message.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settingsId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Banner saved')
    }
    setSaving(false)
  }

  if (loading) return <FlashPageLoader />

  return (
    <AdminPageShell
      title="Promo Banners"
      description="Edit the site-wide announcement banner shown to users on the dashboard."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Banner Editor">
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-white/5">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Show Banner</p>
                <p className="text-xs text-gray-500 dark:text-white/50">Toggle visibility on user dashboards</p>
              </div>
              <Switch checked={show} onCheckedChange={setShow} />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Promo message for users..."
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Banner'}
            </Button>
          </form>
        </AdminPanel>

        <AdminPanel title="Preview" description="How the banner appears to users">
          {show && message.trim() ? (
            <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{title.trim() || 'Announcement'}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-white/65">{message}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-12 text-gray-400 dark:border-white/10">
              <Eye className="h-8 w-8" />
              <p className="text-sm">Banner hidden or empty</p>
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}
