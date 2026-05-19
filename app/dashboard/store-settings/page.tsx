'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Store, Loader2, Link2, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const HEX_COLOR_REGEX = /^#([a-fA-F0-9]{6})$/

const normalizeHexColor = (value: string) => {
  const cleaned = value.trim()
  if (!cleaned) return '#0ea5e9'

  if (HEX_COLOR_REGEX.test(cleaned)) {
    return cleaned.toLowerCase()
  }

  const withoutHash = cleaned.replace('#', '')
  if (/^[a-fA-F0-9]{6}$/.test(withoutHash)) {
    return `#${withoutHash.toLowerCase()}`
  }

  return '#0ea5e9'
}

export default function StoreSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [agentId, setAgentId] = useState('')
  const [slug, setSlug] = useState('')
  const [brandName, setBrandName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [themeColor, setThemeColor] = useState('#0ea5e9')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [allowData, setAllowData] = useState(true)
  const [allowOnlineServices, setAllowOnlineServices] = useState(true)
  const [isActive, setIsActive] = useState(true)

  const ensureProfileExists = async (uid: string) => {
    const { data: existingProfile, error: profileFetchError } = await supabase.client
      .from('profiles')
      .select('id')
      .eq('id', uid)
      .maybeSingle()

    if (profileFetchError) {
      return profileFetchError
    }

    if (existingProfile) {
      return null
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    const fullName = (user?.user_metadata?.full_name as string | undefined)?.trim() || null
    const phone = (user?.user_metadata?.phone as string | undefined)?.trim() || null

    const { error: insertProfileError } = await supabase.client
      .from('profiles')
      .insert({
        id: uid,
        full_name: fullName,
        phone,
      })

    if (insertProfileError && !insertProfileError.message.toLowerCase().includes('duplicate key')) {
      return insertProfileError
    }

    return null
  }

  const resolveAgentId = async () => {
    if (agentId) {
      return agentId
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id || ''
    if (userId) {
      setAgentId(userId)
      return userId
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const sessionUserId = sessionData.session?.user?.id || ''
    if (sessionUserId) {
      setAgentId(sessionUserId)
    }

    return sessionUserId
  }

  useEffect(() => {
    const loadStore = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        toast.error('Please login again')
        setLoading(false)
        return
      }

      const uid = userData.user.id
      setAgentId(uid)

      const { data: existingStore, error } = await supabase.client
        .from('agent_stores')
        .select('slug,brand_name,tagline,description,logo_url,cover_url,theme_color,contact_phone,contact_email,whatsapp_number,allow_data,allow_online_services,is_active')
        .eq('agent_id', uid)
        .maybeSingle()

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      if (existingStore) {
        setSlug(existingStore.slug)
        setBrandName(existingStore.brand_name)
        setTagline(existingStore.tagline || '')
        setDescription(existingStore.description || '')
        setLogoUrl(existingStore.logo_url || '')
        setCoverUrl(existingStore.cover_url || '')
        setThemeColor(existingStore.theme_color || '#0ea5e9')
        setContactPhone(existingStore.contact_phone || '')
        setContactEmail(existingStore.contact_email || '')
        setWhatsappNumber(existingStore.whatsapp_number || '')
        setAllowData(existingStore.allow_data)
        setAllowOnlineServices(existingStore.allow_online_services)
        setIsActive(existingStore.is_active)
      } else {
        const suggested = (userData.user.user_metadata?.full_name || userData.user.email || 'agent')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 40)
        setSlug(suggested || 'agent-store')
        setBrandName(userData.user.user_metadata?.full_name || 'My Data Store')
      }

      setLoading(false)
    }

    void loadStore()
  }, [])

  const publicLink = useMemo(() => {
    if (!slug) return ''
    if (typeof window === 'undefined') return `/store/${slug}`
    return `${window.location.origin}/store/${slug}`
  }, [slug])

  const previewThemeColor = useMemo(() => normalizeHexColor(themeColor), [themeColor])

  const handleSave = async () => {
    const normalizedSlug = slug.trim().toLowerCase()

    const currentAgentId = await resolveAgentId()
    if (!currentAgentId) {
      toast.error('Unable to identify current agent')
      return
    }

    if (!brandName.trim() || !normalizedSlug) {
      toast.error('Brand name and slug are required')
      return
    }

    if (!SLUG_REGEX.test(normalizedSlug)) {
      toast.error('Use lowercase letters, numbers, and hyphens only for slug')
      return
    }

    const profileError = await ensureProfileExists(currentAgentId)
    if (profileError) {
      toast.error(`Unable to initialize profile: ${profileError.message}`)
      return
    }

    setSaving(true)

    const payload = {
      agent_id: currentAgentId,
      slug: normalizedSlug,
      brand_name: brandName.trim(),
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
      cover_url: coverUrl.trim() || null,
      theme_color: normalizeHexColor(themeColor),
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      whatsapp_number: whatsappNumber.trim() || null,
      allow_data: allowData,
      allow_online_services: allowOnlineServices,
      is_active: isActive,
    }

    const { error } = await supabase.client
      .from('agent_stores')
      .upsert(payload, { onConflict: 'agent_id' })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSlug(normalizedSlug)
    toast.success('Store settings saved')
  }

  const copyLink = async () => {
    if (!publicLink) return
    await navigator.clipboard.writeText(publicLink)
    toast.success('Store link copied')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading store settings...
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Store Settings</h1>
        <p className="text-muted-foreground">Control your store slug, branding, and public availability</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Branding & Identity
            </CardTitle>
            <CardDescription>Your public mini website details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Custom Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="e.g. kwame-data-hub" />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens only.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4 text-primary" />
                  Public Store Link
                </p>
                <Button variant="outline" size="sm" className="gap-1" onClick={copyLink} disabled={!slug}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-primary">{publicLink || 'Set slug to generate link'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverUrl">Cover URL</Label>
                <Input id="coverUrl" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="themeColor">Theme Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="themeColor"
                    type="color"
                    value={previewThemeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-1"
                    aria-label="Pick store theme color"
                  />
                  <Input
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    placeholder="#0ea5e9"
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <p className="mb-1 text-xs text-muted-foreground">Preview</p>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: previewThemeColor }} />
                    <span className="text-sm font-medium text-foreground">{previewThemeColor}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Support Phone</Label>
                <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Support Email</Label>
                <Input id="contactEmail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input id="whatsappNumber" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>What users can buy from your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Store Active</p>
                <p className="text-xs text-muted-foreground">Public can access your slug page</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Sell Data</p>
                <p className="text-xs text-muted-foreground">Show data packages tab</p>
              </div>
              <Switch checked={allowData} onCheckedChange={setAllowData} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Sell Other Services</p>
                <p className="text-xs text-muted-foreground">Show services tab</p>
              </div>
              <Switch checked={allowOnlineServices} onCheckedChange={setAllowOnlineServices} />
            </div>

            <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Store Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
