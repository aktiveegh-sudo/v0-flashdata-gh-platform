'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, Link2, MessageSquare, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  DashboardPageShell,
  DashboardPanel,
} from '@/components/dashboard/page-shell'
import { FlashPageLoader } from '@/components/flash-loader'
import { fetchAgentStore } from '@/lib/dashboard/agent-pages-data'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'flashdata_whatsapp_bot_settings'

type BotSettings = {
  autoReply: boolean
  welcomeMessage: string
}

const DEFAULT_SETTINGS: BotSettings = {
  autoReply: true,
  welcomeMessage:
    'Welcome to {{store_link}}! Browse our data bundles and pay securely. Reply HELP for assistance.',
}

export default function WhatsAppBotPage() {
  const [storeSlug, setStoreSlug] = useState('')
  const [settings, setSettings] = useState<BotSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) {
        setError('Please login again')
        setLoading(false)
        return
      }

      try {
        const store = await fetchAgentStore(userId)
        if (store?.slug) setStoreSlug(store.slug)

        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<BotSettings>
          setSettings({
            autoReply: parsed.autoReply ?? DEFAULT_SETTINGS.autoReply,
            welcomeMessage: parsed.welcomeMessage ?? DEFAULT_SETTINGS.welcomeMessage,
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load settings')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const storeLinkVariable = '{{store_link}}'
  const previewStoreUrl = useMemo(() => {
    if (!storeSlug || typeof window === 'undefined') return storeLinkVariable
    return `${window.location.origin}/store/${storeSlug}`
  }, [storeSlug])

  const previewMessage = settings.welcomeMessage.replaceAll(storeLinkVariable, previewStoreUrl)

  const handleSave = async () => {
    setSaving(true)

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      toast.success('WhatsApp bot settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const insertVariable = () => {
    setSettings((prev) => ({
      ...prev,
      welcomeMessage: prev.welcomeMessage.includes(storeLinkVariable)
        ? prev.welcomeMessage
        : `${prev.welcomeMessage.trim()} ${storeLinkVariable}`.trim(),
    }))
  }

  if (loading) return <FlashPageLoader />

  if (error) {
    return (
      <DashboardPageShell title="WhatsApp Bot" description="Configure auto-replies for your store.">
        <DashboardPanel>
          <p className="text-sm text-red-500">{error}</p>
        </DashboardPanel>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell
      title="WhatsApp Bot"
      description="Set up automated replies with your store link for WhatsApp customers."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardPanel title="Bot Settings">
          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4 dark:border-white/5">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Auto-Reply</p>
                <p className="text-xs text-gray-500 dark:text-white/45">Send welcome message to new chats</p>
              </div>
              <Switch
                checked={settings.autoReply}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoReply: checked }))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="welcome">Welcome Message</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={insertVariable}>
                  <Link2 className="h-3 w-3" />
                  Insert {storeLinkVariable}
                </Button>
              </div>
              <Textarea
                id="welcome"
                rows={6}
                value={settings.welcomeMessage}
                onChange={(e) => setSettings((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                placeholder="Type your welcome message..."
              />
              <p className="text-xs text-gray-500 dark:text-white/45">
                Use <code className="rounded bg-gray-100 px-1 dark:bg-white/10">{storeLinkVariable}</code> for your
                store URL
              </p>
            </div>

            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full gap-2 bg-amber-400 text-black hover:bg-amber-300"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Message Preview">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-white/50">
              <Bot className="h-4 w-4 text-amber-500" />
              WhatsApp auto-reply preview
            </div>
            <div className="rounded-2xl border border-gray-100 bg-[#e5ddd5] p-4 dark:border-white/5 dark:bg-[#0b141a]">
              <div className="max-w-[90%] rounded-xl rounded-tl-none bg-white p-3 shadow-sm dark:bg-[#005c4b]">
                <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{previewMessage}</p>
                <p className="mt-1 text-right text-[10px] text-gray-400">12:00</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
                <MessageSquare className="h-3.5 w-3.5" />
                Store Link Variable
              </div>
              <Input readOnly value={previewStoreUrl} className="mt-2 font-mono text-xs" />
            </div>

            <p className="text-xs text-gray-500 dark:text-white/45">
              Settings are saved locally on this device. Connect WhatsApp Business API for live automation.
            </p>
          </div>
        </DashboardPanel>
      </div>
    </DashboardPageShell>
  )
}
