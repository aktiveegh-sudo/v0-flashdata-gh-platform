'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { supabase } from '@/lib/supabase/client'
import { ensureProfileAndWalletForUser } from '@/lib/supabase/profile-bootstrap'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { PageLoader } from '@/components/loader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, setAuthUser, clearAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const ensureSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session?.user) {
        clearAuth()
        router.push('/')
        setCheckingSession(false)
        return
      }

      await ensureProfileAndWalletForUser(data.session.user)

      const metadata = data.session.user.user_metadata as { full_name?: string; phone?: string; avatar_url?: string }

      const { data: profile } = await supabase.client
        .from('profiles')
        .select('role,status')
        .eq('id', data.session.user.id)
        .maybeSingle()

      const isSuperAdmin =
        profile?.role === 'super_admin' ||
        (data.session.user.email || '').toLowerCase() === 'admin@flashdatagh.com'

      if (profile?.status === 'suspended') {
        clearAuth()
        await supabase.auth.signOut()
        router.push('/')
        setCheckingSession(false)
        return
      }

      if (isSuperAdmin) {
        router.push('/admin/overview')
        setCheckingSession(false)
        return
      }

      setAuthUser({
        id: data.session.user.id,
        name: metadata?.full_name || data.session.user.email?.split('@')[0] || 'User',
        email: data.session.user.email || '',
        phone: metadata?.phone || '',
        avatar: metadata?.avatar_url,
      })
      setCheckingSession(false)
    }

    void ensureSession()
  }, [clearAuth, mounted, router, setAuthUser])

  useEffect(() => {
    if (!mounted) {
      return
    }

    const loadWhatsappChannel = async () => {
      const { data } = await supabase.client
        .from('site_settings')
        .select('whatsapp_channel_url')
        .limit(1)
        .maybeSingle()

      const raw = (data as { whatsapp_channel_url?: string | null } | null)?.whatsapp_channel_url || ''
      setWhatsappChannelUrl(raw.trim())
    }

    void loadWhatsappChannel()
  }, [mounted])

  if (!mounted || checkingSession) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <PageLoader />
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      {whatsappChannelUrl ? (
        <a
          href={whatsappChannelUrl}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/30 transition hover:bg-green-600"
          aria-label="Open WhatsApp channel"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp Channel
        </a>
      ) : null}
    </div>
  )
}
