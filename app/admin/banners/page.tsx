'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImageIcon, Plus, Save, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FlashPageLoader } from '@/components/flash-loader'
import { AdminPageShell, AdminPanel } from '@/components/admin/page-shell'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

type PromoBanner = {
  id: string
  image_url: string
  sort_order: number
  is_active: boolean
}

export default function AdminBannersPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [banners, setBanners] = useState<PromoBanner[]>([])
  const [newSortOrder, setNewSortOrder] = useState('0')

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) throw new Error('Please login again')
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/promo-banners', { headers })
      const payload = (await response.json()) as { success?: boolean; data?: PromoBanner[]; error?: string }
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load banners')
      setBanners(payload.data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Please login again')

      const response = await fetch('/api/admin/storage/upload-service-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const result = (await response.json()) as { success?: boolean; data?: { publicUrl?: string }; error?: string }
      if (!response.ok || !result.success || !result.data?.publicUrl) {
        throw new Error(result.error || 'Upload failed')
      }

      const headers = await getAuthHeaders()
      const createResponse = await fetch('/api/admin/promo-banners', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_url: result.data.publicUrl,
          sort_order: Number(newSortOrder) || 0,
          is_active: true,
        }),
      })

      const createPayload = (await createResponse.json()) as { success?: boolean; error?: string }
      if (!createResponse.ok || !createPayload.success) {
        throw new Error(createPayload.error || 'Could not save banner')
      }

      toast.success('Promo banner added')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const updateBanner = async (banner: PromoBanner) => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const response = await fetch('/api/admin/promo-banners', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(banner),
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Update failed')
      toast.success('Banner updated')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteBanner = async (id: string) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/promo-banners?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      })
      const payload = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Delete failed')
      toast.success('Banner removed')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) return <FlashPageLoader />

  return (
    <AdminPageShell
      title="Promo Banners"
      description="Upload image banners shown on the agent dashboard. No text or links required — images only."
    >
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <AdminPanel title="Add Banner">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sort-order">Display order</Label>
              <Input
                id="sort-order"
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 dark:text-white/50">Lower numbers appear first in the carousel.</p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center transition hover:border-amber-400 hover:bg-amber-50/40 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-amber-400/40">
              <Upload className="h-8 w-8 text-amber-500" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{uploading ? 'Uploading...' : 'Upload banner image'}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-white/50">PNG, JPG or WebP · max 5MB</p>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void uploadImage(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </AdminPanel>

        <AdminPanel title={`Active Banners (${banners.length})`} description="These images rotate on every agent dashboard.">
          {banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-16 text-gray-400 dark:border-white/10">
              <ImageIcon className="h-10 w-10" />
              <p className="text-sm">No promo banners yet</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {banners.map((banner) => (
                <div key={banner.id} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10">
                  <img src={banner.image_url} alt="Promo banner" className="aspect-[21/9] w-full object-cover" />
                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wide text-gray-500">Active</Label>
                      <Switch
                        checked={banner.is_active}
                        onCheckedChange={(checked) => void updateBanner({ ...banner, is_active: checked })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-gray-500">Sort order</Label>
                      <Input
                        type="number"
                        value={banner.sort_order}
                        onChange={(e) =>
                          setBanners((prev) =>
                            prev.map((row) => (row.id === banner.id ? { ...row, sort_order: Number(e.target.value) } : row))
                          )
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={saving}
                        onClick={() => void updateBanner(banner)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void deleteBanner(banner.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminPageShell>
  )
}
