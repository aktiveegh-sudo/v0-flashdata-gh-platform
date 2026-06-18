'use client'

import { useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type AnnouncementSettings = {
  show_announcement: boolean
  announcement_title: string | null
  announcement_message: string | null
}

export function AnnouncementBanner() {
  const [settings, setSettings] = useState<AnnouncementSettings | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.client
        .from('site_settings')
        .select('show_announcement,announcement_title,announcement_message')
        .limit(1)
        .maybeSingle()

      setSettings((data as AnnouncementSettings | null) || null)
    }

    void load()
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('flashdata-dismiss-announcement') === '1') {
      setDismissed(true)
    }
  }, [])

  if (dismissed || !settings?.show_announcement) return null

  const title = settings.announcement_title?.trim() || 'Announcement'
  const message = settings.announcement_message?.trim()

  if (!message) return null

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-white/65">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('flashdata-dismiss-announcement', '1')
            setDismissed(true)
          }}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
