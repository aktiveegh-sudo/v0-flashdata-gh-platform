'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'

export function WhatsAppChannelFab({
  url,
  className = '',
}: {
  url?: string
  className?: string
}) {
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState(url?.trim() || '')

  useEffect(() => {
    if (url?.trim()) {
      setWhatsappChannelUrl(url.trim())
      return
    }

    const load = async () => {
      try {
        const response = await fetch('/api/site-settings/public', { cache: 'no-store' })
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean
          data?: { whatsappChannelUrl?: string }
        } | null

        if (response.ok && payload?.success) {
          setWhatsappChannelUrl((payload.data?.whatsappChannelUrl || '').trim())
        }
      } catch {
        // Keep hidden if settings cannot be loaded.
      }
    }

    void load()
  }, [url])

  if (!whatsappChannelUrl) {
    return null
  }

  return (
    <a
      href={whatsappChannelUrl}
      target="_blank"
      rel="noreferrer"
      className={`fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:-translate-y-0.5 hover:bg-green-600 ${className}`}
      aria-label="Open WhatsApp channel"
    >
      <MessageCircle className="h-4 w-4" />
      WhatsApp Channel
    </a>
  )
}
